import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  image?: string; // ✅ নতুন ফিল্ড: ক্যাটাগরি ইমেজ/আইকন
  isNav: boolean;
  parentId: mongoose.Schema.Types.ObjectId | null;
}

const CategorySchema: Schema<ICategory> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    image: {
      type: String, // ইমেজের URL স্টোর হবে
      default: null,
    },
    isNav: {
      type: Boolean,
      default: false,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Category: Model<ICategory> = mongoose.model<ICategory>('Category', CategorySchema);

export default Category;