import mongoose, { Document, Schema, Model } from 'mongoose';

// Interface for Product Document
export interface IProduct extends Document {
  name: string;
  slug: string;
  brand: string;
  category: mongoose.Schema.Types.ObjectId; // <-- Changed from string
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
      type: mongoose.Schema.Types.ObjectId, // <-- Changed from String
      ref: 'Category', // <-- Added reference to the Category model
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
