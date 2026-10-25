const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      default: "",
    },
    lastName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    /** bcrypt hash of the 4-digit app PIN. Never returned in API responses. */
    pinHash: {
      type: String,
      select: false,
    },
    pinSet: {
      type: Boolean,
      default: false,
    },
    /** Platform authenticators (fingerprint / Face ID / Windows Hello) for app unlock. */
    webauthnCredentials: {
      type: [
        {
          credentialId: { type: String, required: true },
          publicKey: { type: String, required: true },
          counter: { type: Number, default: 0 },
          transports: { type: [String], default: [] },
          rpId: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    /** Onboarding flag — whether the user confirmed an opening balance. */
    openingBalanceSet: {
      type: Boolean,
      default: false,
    },
    /** Bumped on expense/income/transfer/account writes. Cheap dashboard sync stamp. */
    dataVersion: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
