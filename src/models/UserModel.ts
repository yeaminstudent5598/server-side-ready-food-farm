import mongoose, { Document, Schema, Model } from 'mongoose';

// কার্টের প্রতিটি আইটেমের জন্য নতুন গঠন
const CartItemSchema = new Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
    },
});

export interface IUser extends Document {
  uid: string;
  name: string;
  email: string;
  phone: string;
  image?: string;
  role: 'user' | 'admin';
  cart: { product: mongoose.Schema.Types.ObjectId; quantity: number }[];
  wishlist: mongoose.Schema.Types.ObjectId[];
}

const UserSchema: Schema<IUser> = new Schema(
  {
    uid: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, required: true },
    image: { type: String },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    cart: [CartItemSchema],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
export default User;