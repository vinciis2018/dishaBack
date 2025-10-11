import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  availability: { type: Boolean, default: true },
  minOrderQuanity: { type: Number, default: 10 },
});

const favouriteSchema = new mongoose.Schema({
  userId: { type: String, default: "" },
  username: { type: String, default: "" },
  products: { type: [productSchema], default: [] },
}, {
  timestamps: true
});

const Favourite = mongoose.model('Favourite', favouriteSchema);

export default Favourite;
