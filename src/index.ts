import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import Product, { IProduct } from './models/ProductModel';
import Category, { ICategory } from './models/CategoryModel';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app: Express = express();
const port = process.env.PORT || 9000;

// Middlewares
app.use(cors());
app.use(express.json());

// ================== HELPER FUNCTIONS ==================
// ✅ Moved generateSlug function to the top level
const generateSlug = (name: string): string => {
  const baseSlug = name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return `${baseSlug}-${Date.now()}`;
};

// ================== CATEGORY API ROUTES ==================

// POST /api/categories - Create a new category
app.post('/api/categories', async (req: Request, res: Response) => {
    try {
        const { name, parentId } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Category name is required.' });
        }
        const slug = generateSlug(name); // Now this will work correctly

        const newCategory = new Category({ name, slug, parentId: parentId || null });
        const savedCategory = await newCategory.save();
        res.status(201).json(savedCategory);
    } catch (error) {
        if (error instanceof Error && (error as any).code === 11000) {
             return res.status(409).json({ message: 'A category with this name already exists.' });
        }
        if (error instanceof Error) {
            res.status(500).json({ message: `Server error: ${error.message}` });
        } else {
            res.status(500).json({ message: 'An unknown server error occurred.' });
        }
    }
});

// GET /api/categories - Get all categories
app.get('/api/categories', async (req: Request, res: Response) => {
    try {
        const categories = await Category.find({}).sort({ name: 1 }).populate('parentId', 'name');
        res.status(200).json(categories);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: `Server error: ${error.message}` });
        } else {
            res.status(500).json({ message: 'An unknown server error occurred.' });
        }
    }
});

// PUT /api/categories/:id - Update a category
app.put('/api/categories/:id', async (req: Request, res: Response) => {
    try {
        const { name, parentId } = req.body;
        const { id } = req.params;

        if (!name) {
            return res.status(400).json({ message: 'Category name is required.' });
        }

        // When updating, we should also update the slug if the name changes.
        const categoryToUpdate = await Category.findById(id);
        if (!categoryToUpdate) {
            return res.status(404).json({ message: 'Category not found.' });
        }
        
        let newSlug = categoryToUpdate.slug;
        if (name !== categoryToUpdate.name) {
            newSlug = generateSlug(name);
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name, slug: newSlug, parentId: parentId || null },
            { new: true }
        );

        res.status(200).json(updatedCategory);
    } catch (error) {
         if (error instanceof Error && (error as any).code === 11000) {
             return res.status(409).json({ message: 'A category with this name already exists.' });
        }
        if (error instanceof Error) {
            res.status(500).json({ message: `Server error: ${error.message}` });
        } else {
            res.status(500).json({ message: 'An unknown server error occurred.' });
        }
    }
});

// DELETE /api/categories/:id - Delete a category
app.delete('/api/categories/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deletedCategory = await Category.findByIdAndDelete(id);
        if (!deletedCategory) {
            return res.status(404).json({ message: 'Category not found.' });
        }
        await Category.updateMany({ parentId: id }, { $set: { parentId: null } });

        res.status(200).json({ message: 'Category deleted successfully.' });
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: `Server error: ${error.message}` });
        } else {
            res.status(500).json({ message: 'An unknown server error occurred.' });
        }
    }
});


// ================== PRODUCT API ROUTES ==================

app.post('/api/products', async (req: Request, res: Response) => {
  try {
    const productData: IProduct = req.body;
    const slug = generateSlug(productData.name); // This will also work correctly

    if (!productData.name || !productData.category || !productData.pricing.regular || productData.stock === undefined) {
      return res.status(400).json({ message: 'Name, Category, Price, and Stock are required.' });
    }
    const newProduct = new Product({ ...productData, slug: slug });
    const savedProduct = await newProduct.save();

    res.status(201).json({
      message: "Product added successfully with SEO Slug!",
      product: savedProduct,
    });
  } catch (error) {
    if (error instanceof Error) {
        res.status(500).json({ message: `Server error: ${error.message}` });
    } else {
        res.status(500).json({ message: 'An unknown server error occurred.' });
    }
  }
});

// GET /api/products/deals - Get products with discounts
app.get('/api/products', async (req: Request, res: Response) => {
    try {
        const deals = await Product.find({
            // Find products where a discount price exists and is less than the regular price
            'pricing.discount': { $exists: true, $ne: null },
            $expr: { $lt: [ "$pricing.discount", "$pricing.regular" ] }
        })
        .populate('category', 'name')
        .sort({ createdAt: -1 }) // Show newest deals first
        .limit(20); // Limit to a maximum of 20 deals

        res.status(200).json(deals);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: `Server error: ${error.message}` });
        } else {
            res.status(500).json({ message: 'An unknown server error occurred.' });
        }
    }
});

app.get('/api/products/:slug', async (req: Request, res: Response) => {
    try {
        const product = await Product.findOne({ slug: req.params.slug });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json(product);
    } catch (error) {
       if (error instanceof Error) {
            res.status(500).json({ message: `Server error: ${error.message}` });
        } else {
            res.status(500).json({ message: 'An unknown server error occurred.' });
        }
    }
});

// PATCH /api/products/status/:id - Update product status
app.patch('/api/products/status/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Expecting status to be a boolean (true/false)

        if (typeof status !== 'boolean') {
            return res.status(400).json({ message: 'Invalid status value. It must be a boolean.' });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { status: status },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.status(200).json({
            message: 'Product status updated successfully.',
            product: updatedProduct
        });

    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: `Server error: ${error.message}` });
        } else {
            res.status(500).json({ message: 'An unknown server error occurred.' });
        }
    }
});


// DELETE /api/products/:id - Delete a product
app.delete('/api/products/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const deletedProduct = await Product.findByIdAndDelete(id);

        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.status(200).json({ message: 'Product deleted successfully.' });
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: `Server error: ${error.message}` });
        } else {
            res.status(500).json({ message: 'An unknown server error occurred.' });
        }
    }
});


// Start Server
app.listen(port, () => {
  console.log(`🚀 TypeScript Server is rocking on http://localhost:${port}`);
});
