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

app.use(cors());
app.use(express.json());

// একটি হেল্পার ফাংশন যা নাম থেকে ইউনিক স্লাগ তৈরি করে
const generateSlug = (name: string): string => {
  const baseSlug = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  return `${baseSlug}-${Date.now()}`;
};

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
app.get('/api/users', async (req: Request, res: Response) => {
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
        if (existingUser) {
            return res.status(200).json({ message: 'User already exists.' });
        }
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

app.patch('/api/users/:id/role', async (req: Request, res: Response) => {
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

// ================== CATEGORY API ROUTES ==================
app.get('/api/categories', async (req: Request, res: Response) => {
    try {
        const categories = await Category.find({}).sort({ name: 1 });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching categories' });
    }
});

app.post('/api/categories', async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Category name is required.' });
        const slug = generateSlug(name);
        const newCategory = new Category({ name, slug });
        await newCategory.save();
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: 'Server error creating category.' });
    }
});

app.delete('/api/categories/:id', async (req: Request, res: Response) => {
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

app.post('/api/products', async (req: Request, res: Response) => {
  try {
    const productData: IProduct = req.body;
    if (!productData.name) return res.status(400).json({ message: 'Product name is required.' });
    const slug = generateSlug(productData.name);
    const newProduct = new Product({ ...productData, slug });
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create product.' });
  }
});

app.delete('/api/products/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deletedProduct = await Product.findByIdAndDelete(id);
        if (!deletedProduct) return res.status(404).json({ message: 'Product not found.' });
        res.status(200).json({ message: 'Product deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error deleting product.' });
    }
});

app.patch('/api/products/status/:id', async (req: Request, res: Response) => {
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

app.get('/api/products/deals', async (req: Request, res: Response) => {
  try {
    const deals = await Product.find({
      // যেসকল প্রোডাক্টের ডিসকাউন্ট আছে এবং তা রেগুলার মূল্যের চেয়ে কম
      'pricing.discount': { $exists: true, $ne: null },
      $expr: { $lt: [ "$pricing.discount", "$pricing.regular" ] }
    })
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .limit(10); // সর্বোচ্চ ১০টি ডিল দেখানো হবে

    res.status(200).json(deals);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch deals' });
  }
});

// ================== ORDER API ROUTES ==================
app.get('/api/orders', async (req: Request, res: Response) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'name email')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching orders.' });
  }
});

app.patch('/api/orders/:id/status', async (req: Request, res: Response) => {
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