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
    /**
     * @deprecated Amount lives on Account. Kept only to migrate existing rows.
     */
    openingBalance: {
      type: Number,
      min: 0,
    },
    /** Onboarding flag — whether the user confirmed an opening balance. */
    openingBalanceSet: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
