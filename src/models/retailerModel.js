import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  availability: { type: Boolean, default: true },
  minOrderQuanity: { type: Number, default: 10 },
  unitCost: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
  ptr: { type: Number, default: 0 },
});

const retailersSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  address: { type: String, default: "" },
  latitude: { type: String, default: "" },
  longitude: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  country: { type: String, default: "" },
  zipCode: { type: String, default: "" },
  pan: { type: String, default: "" },
  gst: { type: String, default: "" },
  phone: { type: String, default: "" },
  email: { type: String, dafault: "" },
  images: { type: [String], default: ["https://imgs.search.brave.com/vatG32pjyOqEy4VWrBkooS-Ihe1tLXKRBIBTrpzeKFk/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/dmlzdGFybWVkaWEu/Y29tL2h1YmZzL291/dCUyMG9mJTIwaG9t/ZSUyMGFkdmVydGlz/aW5nJTIwaW4lMjBQ/aWNjYWxpbGxpJTIw/U3F1YXJlLnBuZw"] },
  ownerId: { type: String, required: true },
  ownerName: { type: String, required: true },
  ownerEmail: { type: String, required: true },
  products: { type: [productSchema], default: [] },
  ordersPlaced: { type: [], default: [] },
  createdBy: { type: String, required: true },

}, {
  timestamps: true
});

const Retailer = mongoose.model('Retailer', retailersSchema);

export default Retailer;
