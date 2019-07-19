import mongoose from 'mongoose'

const SkillSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    trim: true,
  },
  groupId: {
    type: String,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  value: {
    type: Number,
    required: true,
    trim: true,
  },
})


export default SkillSchema;
