import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  formula: { type: String, default: "Calcium Carbonate" },
  images: { type: [String], default: ["https://imgs.search.brave.com/vatG32pjyOqEy4VWrBkooS-Ihe1tLXKRBIBTrpzeKFk/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/dmlzdGFybWVkaWEu/Y29tL2h1YmZzL291/dCUyMG9mJTIwaG9t/ZSUyMGFkdmVydGlz/aW5nJTIwaW4lMjBQ/aWNjYWxpbGxpJTIw/U3F1YXJlLnBuZw"] },
  manufacturer: { type: String, default: 'EKUM' },
  type: { type: String, default: "tablet" },
  availability: { type: Boolean, default: true },
  minOrderQuantity: { type: Number, default: 180 },
  piecesPerQuantity: { type: Number, default: 1 }, // ek patte me kitna
  quantityPerUnit: { type: Number, default: 1 }, // ek dabbe me kitne patte
  unitQuantity: { type: Number, default: 10 }, // total ek bach me kitna
  unitCost: { type: Number, default: 0 }, // ek dabbe ka kitna cost
  mrp: { type: Number, default: 0 },
  ptr: { type: Number, default: 0 },
  packSize: { type: Number, default: 0 },
  description: { type: String, default: "" },
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);

export default Product;
