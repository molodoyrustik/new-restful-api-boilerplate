import mongoose from 'mongoose'

const WorksSchema = new mongoose.Schema({
  id: {
    type: String,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  technologies: {
    type: String,
    required: true,
    trim: true,
  },
  imgUrl: {
    type: String,
    required: true,
    trim: true,
  },
})


export default WorksSchema
