import mongoose from "mongoose";

const archivedRecordSchema = new mongoose.Schema(
{
    originalCollection: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    originalId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },

    dataSnapshot: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
},
{
    timestamps: true
});

// No pre-save existence check here on purpose: this collection exists to keep
// a record of something AFTER it may have already been deleted elsewhere,
// so requiring the original document to still exist would defeat its purpose.

const archivedRecordModel = mongoose.model(
    "archived_record",
    archivedRecordSchema
);

export default archivedRecordModel;
