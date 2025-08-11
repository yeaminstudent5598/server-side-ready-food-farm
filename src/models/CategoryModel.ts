import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for Category Document
export interface ICategory extends Document {
  name: string;
  slug: string;
  parentId: mongoose.Schema.Types.ObjectId | null;
}

const CategorySchema: Schema<ICategory> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true, // Each category name must be unique
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category', // This creates a relationship to itself
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Category: Model<ICategory> = mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
