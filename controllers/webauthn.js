const User = require("../models/User");
const { HttpError } = require("../utils/HttpError");
const asyncHandler = require("../middleware/asyncHandler");
const { issueAppSession } = require("../utils/appSessionToken");
const { requireClientOrigin } = require("../utils/clientOrigin");
const { APP_NAME } = require("../constants/app");

const challenges = new Map();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
let webauthnModule = null;

function challengeKey(userId, kind) {
  return `${userId}:${kind}`;
}

function storeChallenge(userId, kind, challenge) {
  const now = Date.now();
  for (const [key, entry] of challenges) {
    if (entry.expiresAt <= now) challenges.delete(key);
  }
  challenges.set(challengeKey(userId, kind), {
    challenge,
    expiresAt: now + CHALLENGE_TTL_MS,
  });
}

function takeChallenge(userId, kind) {
  const key = challengeKey(userId, kind);
  const entry = challenges.get(key);
  challenges.delete(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    throw new HttpError(400, "Unlock expired. Try again.");
  }
  return entry.challenge;
}

function toBase64Url(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value) {
  return new Uint8Array(Buffer.from(String(value), "base64url"));
}

function credentialsForRp(user, rpID) {
  return (user.webauthnCredentials || []).filter((credential) => credential.rpId === rpID);
}

function asDescriptors(credentials) {
  return credentials.map((credential) => ({
    id: credential.credentialId,
    transports: credential.transports,
  }));
}

function loadWebAuthn() {
  if (!webauthnModule) {
    webauthnModule = import("@simplewebauthn/server");
  }
  return webauthnModule;
}

async function loadUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  return user;
}

async function verifiedOrThrow(run, message) {
  try {
    const verification = await run();
    if (!verification.verified) {
      throw new HttpError(400, message);
    }
    return verification;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, message);
  }
}

exports.registerOptions = asyncHandler(async (req, res) => {
  const { rpID } = requireClientOrigin(req);
  const user = await loadUser(req.userId);
  if (!user.pinSet) {
    throw new HttpError(400, "Set a PIN before enabling fingerprint or Face ID");
  }

  const { generateRegistrationOptions } = await loadWebAuthn();
  const options = await generateRegistrationOptions({
    rpName: APP_NAME,
    rpID,
    userName: user.email,
    userDisplayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
    userID: new Uint8Array(Buffer.from(String(user._id), "utf8")),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
    preferredAuthenticatorType: "localDevice",
    excludeCredentials: asDescriptors(credentialsForRp(user, rpID)),
  });

  storeChallenge(user._id, "register", options.challenge);
  return res.status(200).json(options);
});

exports.registerCredential = asyncHandler(async (req, res) => {
  const { origin, rpID } = requireClientOrigin(req);
  const user = await loadUser(req.userId);
  const expectedChallenge = takeChallenge(user._id, "register");
  const { verifyRegistrationResponse } = await loadWebAuthn();
  const verification = await verifiedOrThrow(
    () =>
      verifyRegistrationResponse({
        response: req.body,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      }),
    "Could not enable fingerprint or Face ID"
  );

  const { credential } = verification.registrationInfo;
  const credentialId = toBase64Url(credential.id);
  const alreadySaved = credentialsForRp(user, rpID).some(
    (entry) => entry.credentialId === credentialId
  );
  if (!alreadySaved) {
    user.webauthnCredentials.push({
      credentialId,
      publicKey: toBase64Url(credential.publicKey),
      counter: credential.counter ?? 0,
      transports: credential.transports || req.body?.response?.transports || [],
      rpId: rpID,
    });
    await user.save();
  }

  return res.status(200).json({ enrolled: true });
});

exports.authenticateOptions = asyncHandler(async (req, res) => {
  const { rpID } = requireClientOrigin(req);
  const user = await loadUser(req.userId);
  const existing = credentialsForRp(user, rpID);
  if (existing.length === 0) {
    throw new HttpError(400, "Fingerprint or Face ID is not set up on this device");
  }

  const { generateAuthenticationOptions } = await loadWebAuthn();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: asDescriptors(existing),
  });

  storeChallenge(user._id, "authenticate", options.challenge);
  return res.status(200).json(options);
});

exports.authenticateCredential = asyncHandler(async (req, res) => {
  const { origin, rpID } = requireClientOrigin(req);
  const user = await loadUser(req.userId);
  const credentialId = toBase64Url(req.body?.id || req.body?.rawId);
  const stored = credentialsForRp(user, rpID).find((credential) => credential.credentialId === credentialId);
  if (!stored) {
    throw new HttpError(400, "This device is not registered for unlock");
  }

  const expectedChallenge = takeChallenge(user._id, "authenticate");
  const { verifyAuthenticationResponse } = await loadWebAuthn();
  const verification = await verifiedOrThrow(
    () =>
      verifyAuthenticationResponse({
        response: req.body,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: stored.credentialId,
          publicKey: fromBase64Url(stored.publicKey),
          counter: stored.counter || 0,
          transports: stored.transports,
        },
        requireUserVerification: true,
      }),
    "Fingerprint or Face ID did not match"
  );

  const nextCounter = verification.authenticationInfo?.newCounter;
  if (typeof nextCounter === "number") {
    stored.counter = nextCounter;
    await user.save();
  }

  return res.status(200).json({ appSession: issueAppSession(user._id) });
});

exports.removeCredentials = asyncHandler(async (req, res) => {
  const { rpID } = requireClientOrigin(req);
  const user = await loadUser(req.userId);
  user.webauthnCredentials = (user.webauthnCredentials || []).filter(
    (credential) => credential.rpId !== rpID
  );
  await user.save();
  return res.status(200).json({ enrolled: false });
});
