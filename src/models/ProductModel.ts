import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug: string;
  brand: string;
  category: mongoose.Schema.Types.ObjectId;
  pricing: {
    regular: number;
    discount?: number;
  };
  stock: number;
  status: boolean;
  images: string[];
  details: {
    description?: string;
    specification?: string;
    warranty?: string;
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
  };
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    brand: { type: String, default: 'Unbranded' },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category', // <-- এটি Category মডেলের সাথে সম্পর্ক তৈরি করে
      required: true,
    },
    pricing: {
      regular: { type: Number, required: true },
      discount: { type: Number },
    },
    stock: { type: Number, required: true, default: 0 },
    status: { type: Boolean, default: false },
    images: [{ type: String }],
    details: {
      description: { type: String },
      specification: { type: String },
      warranty: { type: String },
    },
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

const Product: Model<IProduct> = mongoose.model<IProduct>('Product', ProductSchema);

export default Product;