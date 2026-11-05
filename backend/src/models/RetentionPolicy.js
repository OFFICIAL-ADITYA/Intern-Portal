import mongoose from 'mongoose';

const retentionPolicySchema = new mongoose.Schema({
  policyKey: {
    type: String,
    enum: ['intern'],
    default: 'intern',
    unique: true,
  },
  graceDays: {
    type: Number,
    min: 1,
    default: 30,
    required: true,
  },
  purgeDays: {
    type: Number,
    min: 1,
    default: 90,
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    default: null,
  },
}, { timestamps: true });

retentionPolicySchema.pre('validate', function validatePurgeWindow() {
  if (this.purgeDays <= this.graceDays) {
    this.invalidate('purgeDays', 'Purge period must be greater than the grace period.');
  }
});

const RetentionPolicy = mongoose.model('retention_policy', retentionPolicySchema);

export default RetentionPolicy;
