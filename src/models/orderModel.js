import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  availability: { type: Boolean, default: true },
  minOrderQuanity: { type: Number, default: 10 },
  orderQuantity: { type: Number, default: 1 },
  ptr: { type: Number, default: 0 },
  mrp: { type: Number, default: 0 },
});

const orderSchema = new mongoose.Schema({
  userId: { type: String, default: "" },
  username: { type: String, default: "" },
  products: { type: [productSchema], default: [] },
  orderDate: { type: String, default: "" },
  orderStatus: { type: String, default: "pending" },
  expectedDeliveryDate: { type: String, default: "" },
  actualDeliveryDate: { type: String, default: "" },
  deliveryStatus: { type: String, default: "pending" },
  totalAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, default: "pending" },
  paymentId: { type: String, default: "" },
  paymentMethod: { type: String, default: "" },
  paymentDetails: { type: Object, default: {} },
  deliveryAddress: {},
  notes: { type: String, default: "" },
  retailerId: { type: String, default: "" },
  retailerName: { type: String, default: "" },
  retailerEmail: { type: String, default: "" },
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
