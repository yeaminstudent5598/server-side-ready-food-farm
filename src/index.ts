import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import connectDB from './config/db';

// সকল মডেল ইম্পোর্ট করা হচ্ছে
import Product, { IProduct } from './models/ProductModel';
import Category from './models/CategoryModel';
import Order from './models/OrderModel';
import User from './models/UserModel';

dotenv.config();
connectDB();

const app: Express = express();
const port = process.env.PORT || 9000;

// Middleware Setup
app.use(cors());
app.use(express.json());

// ================== AUTHENTICATION & JWT ==================
app.post('/jwt', (req: Request, res: Response) => {
    try {
        const user = req.body;
        const secret = process.env.ACCESS_TOKEN_SECRET;
        if (!secret) return res.status(500).send({ message: 'JWT secret not configured!' });
        const token = jwt.sign(user, secret, { expiresIn: '1h' });
        res.send({ token });
    } catch (error) {
        console.error("JWT Error:", error);
        res.status(500).send({ message: 'Failed to generate token.' });
    }
});

// ================== MIDDLEWARE ==================
const verifyToken = (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send({ message: 'unauthorized access' });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!, (err, decoded) => {
        if (err) return res.status(401).send({ message: 'unauthorized access' });
        (req as any).decoded = decoded;
        next();
    });
};

// ================== USER API ROUTES ==================
app.get('/api/users', verifyToken, async (req: Request, res: Response) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (error) {
        console.error("Fetch Users Error:", error);
        res.status(500).json({ message: 'Server error fetching users.' });
    }
});

app.post('/api/users', async (req: Request, res: Response) => {
    try {
        const userData = req.body;
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) return res.status(200).json({ message: 'User already exists.' });
        const newUser = new User(userData);
        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        console.error("Create User Error:", error);
        res.status(500).json({ message: 'Failed to create user.' });
    }
});

app.get('/api/users/admin/:email', verifyToken, async (req: Request, res: Response) => {
    try {
        const email = req.params.email;
        if (email !== (req as any).decoded.email) return res.status(403).send({ message: 'forbidden access' });
        const user = await User.findOne({ email: email });
        const isAdmin = user?.role === 'admin';
        res.status(200).json({ isAdmin });
    } catch (error) {
        console.error("Admin Check Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.patch('/api/users/:id/role', verifyToken, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!role || !['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Invalid role provided.' });
        const updatedUser = await User.findByIdAndUpdate(id, { role }, { new: true });
        if (!updatedUser) return res.status(404).json({ message: 'User not found.' });
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Update Role Error:", error);
        res.status(500).json({ message: 'Server error updating user role.' });
    }
});

// ================== CART & WISHLIST API ROUTES ==================
// GET a user's cart
app.get('/api/cart', verifyToken, async (req: Request, res: Response) => {
    try {
        const userEmail = (req as any).decoded.email;
        const user = await User.findOne({ email: userEmail }).populate('cart.product');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user.cart);
    } catch (error) { res.status(500).json({ message: 'Error fetching cart' }); }
});

// Add/Update item quantity in cart
app.post('/api/cart', verifyToken, async (req: Request, res: Response) => {
    try {
        const { productId, quantity } = req.body;
        const userEmail = (req as any).decoded.email;
        const user = await User.findOne({ email: userEmail });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const cartItemIndex = user.cart.findIndex(item => item.product.toString() === productId);

        if (cartItemIndex > -1) {
            // যদি আইটেম আগে থেকেই থাকে, তাহলে quantity আপডেট করুন
            user.cart[cartItemIndex].quantity += quantity;
        } else {
            // নতুন আইটেম হলে, কার্টে যোগ করুন
            user.cart.push({ product: productId, quantity });
        }
        await user.save();
        await user.populate('cart.product');
        res.status(200).json(user.cart);
    } catch (error) { res.status(500).json({ message: 'Error updating cart' }); }
});

// Remove item from cart
app.delete('/api/cart/:productId', verifyToken, async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const userEmail = (req as any).decoded.email;
        const user = await User.findOneAndUpdate(
            { email: userEmail },
            { $pull: { cart: { product: productId } } },
            { new: true }
        ).populate('cart.product');
        res.status(200).json(user?.cart);
    } catch (error) { res.status(500).json({ message: 'Error removing from cart' }); }
});

// GET a user's wishlist
app.get('/api/wishlist', verifyToken, async (req: Request, res: Response) => {
    try {
        const userEmail = (req as any).decoded.email;
        const user = await User.findOne({ email: userEmail }).populate('wishlist');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user.wishlist);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching wishlist' });
    }
});

// Add item to wishlist
app.post('/api/wishlist', verifyToken, async (req: Request, res: Response) => {
    try {
        const { productId } = req.body;
        const userEmail = (req as any).decoded.email;
        const user = await User.findOneAndUpdate(
            { email: userEmail },
            { $addToSet: { wishlist: productId } },
            { new: true }
        ).populate('wishlist');
        res.status(200).json(user?.wishlist);
    } catch (error) {
        res.status(500).json({ message: 'Error adding to wishlist' });
    }
});

// ================== CATEGORY API ROUTES ==================
app.get('/api/categories', async (req: Request, res: Response) => {
    try {
        const categories = await Category.find({}).sort({ name: 1 });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching categories' });
    }
});

app.post('/api/categories', verifyToken, async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Category name is required.' });
        const slug = name.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-');
        const newCategory = new Category({ name, slug });
        await newCategory.save();
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: 'Server error creating category.' });
    }
});

app.delete('/api/categories/:id', verifyToken, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deletedCategory = await Category.findByIdAndDelete(id);
        if (!deletedCategory) return res.status(404).json({ message: 'Category not found.' });
        res.status(200).json({ message: 'Category deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error deleting category.' });
    }
});

// ================== PRODUCT API ROUTES ==================
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const products = await Product.find({}).populate('category', 'name').sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

app.get('/api/products/deals', async (req: Request, res: Response) => {
  try {
    const deals = await Product.find({
      'pricing.discount': { $exists: true, $ne: null },
      $expr: { $lt: [ "$pricing.discount", "$pricing.regular" ] }
    }).populate('category', 'name').sort({ createdAt: -1 }).limit(10);
    res.status(200).json(deals);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch deals' });
  }
});

app.get('/api/products/:slug', async (req: Request, res: Response) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).populate('category', 'name');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

app.get('/api/products/category/:categoryId', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { exclude, limit = '4' } = req.query;
    const query: any = { category: categoryId };
    if (exclude) {
      query._id = { $ne: exclude };
    }
    const relatedProducts = await Product.find(query).limit(parseInt(limit as string));
    res.status(200).json(relatedProducts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch related products' });
  }
});

app.post('/api/products', verifyToken, async (req: Request, res: Response) => {
  try {
    const productData: IProduct = req.body;
    if (!productData.name) return res.status(400).json({ message: 'Product name is required.' });
    const slug = `${productData.name.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-')}-${Date.now()}`;
    const newProduct = new Product({ ...productData, slug });
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create product.' });
  }
});

app.delete('/api/products/:id', verifyToken, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deletedProduct = await Product.findByIdAndDelete(id);
        if (!deletedProduct) return res.status(404).json({ message: 'Product not found.' });
        res.status(200).json({ message: 'Product deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error deleting product.' });
    }
});

app.patch('/api/products/status/:id', verifyToken, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (typeof status !== 'boolean') return res.status(400).json({ message: 'Invalid status value.' });
        const updatedProduct = await Product.findByIdAndUpdate(id, { status }, { new: true });
        if (!updatedProduct) return res.status(404).json({ message: 'Product not found.' });
        res.status(200).json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: 'Server error updating status.' });
    }
});

// ================== ORDER API ROUTES ==================
app.get('/api/orders', verifyToken, async (req: Request, res: Response) => {
  try {
    const orders = await Order.find({}).populate('user', 'name email').populate('items.product', 'name').sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching orders.' });
  }
});

app.patch('/api/orders/:id/status', verifyToken, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { orderStatus } = req.body;
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!orderStatus || !validStatuses.includes(orderStatus)) return res.status(400).json({ message: 'Invalid order status.' });
        const updatedOrder = await Order.findByIdAndUpdate(id, { orderStatus }, { new: true });
        if (!updatedOrder) return res.status(404).json({ message: 'Order not found.' });
        res.status(200).json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: 'Server error updating order status.' });
    }
});

// ================== HEALTH CHECK ROUTE ==================
app.get('/', (req: Request, res: Response) => {
    res.send('ReadyFood Farm Server is running...');
});

// সার্ভার শুরু করা হচ্ছে
app.listen(port, () => {
  console.log(`🚀 TypeScript Server is rocking on http://localhost:${port}`);
});