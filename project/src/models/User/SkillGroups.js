import mongoose from 'mongoose'

import SkillSchema from './SkillSchema';

const SkillGroups = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  skills: [SkillSchema],
})


export default SkillGroups;
