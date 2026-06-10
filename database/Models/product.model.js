import { Schema, Types } from "mongoose";

const productSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true },
  colors: [{ type: String, required: true }],
  description: { type: String, required: true },

//Inventory
  sold: { type: Number, required: true, default: 0 },//Number of units sold
  stock: { type: Number, required: true, default: 0 },
  
  price: { type: Number, required: true, default: 0 },
  finalPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },

  isOnSale: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  
  mainImage: { type: Object, required: true },
  subImages: [{ type: Object, required: true }],

  likedBy: [{ type: ObjectId, ref: 'User' }], // added to whitelist in user schema / many-to-many many users like many product


  categoryId: { type: Types.ObjectId, ref: "Category", required: true },//One-to-Many relationship
subCategory: [{ type: Types.ObjectId, ref: "SubCategory", required: true }],//one product has many subCategories
  brandId: { type: Types.ObjectId, ref: "Brand", required: true },

  createdBy: { type: Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Types.ObjectId, ref: "User", required: true },
  softDelete: { type: Boolean, default: false },
},{timestamps:true,
    toJSON:{virtuals:true},
    toObject:{virtuals:true}
});

productSchema.virtual('Reviews',{
    localField:'_id',
    foreignField:'productId',
    ref:'Review'
})

const productModel = mongoose.models.Product || model("Product", productSchema);
export default productModel;
