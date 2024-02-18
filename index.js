import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import Database from '@replit/database';
import { getAllProducts, getProduct, getUserInfo } from './src/dbfunctions.js'
import rateLimit from 'express-rate-limit';

const app = express();

// Rate limiter
const limiter = rateLimit({
  timeAllowed: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per 15 minutes
});

app.use(limiter);

const db = new Database()

app.use(cors({
  origin: process.env['originSite']
}));

app.use(morgan('dev'));

app.use(express.json());

app.use(express.urlencoded({ extended: false }));

// async function test() {
//   console.log(db.list().then(keys => {console.log(keys)}));
// }

// test()

// app.use('/api', protect, router)

// db.set("key", "value").then(() => {})
// db.get("key").then(value => {})

app.post('/api/getallproducts', async (req, res) => {
  let products = await getAllProducts();
  console.log(products, 'products');
  res.status(200).send({ productKeys: products[0], productPrices: products[1], productOwners: products[2], productImages: products[3]})
})

app.post('/api/getproduct', async (req, res) => {
  let product = await getProduct(req.body.id);
  res.status(200).send({ productType: product})
})

// TODO: This gets the users plants and other information - used by "Your plants" button
app.post('/api/getuser', async (req, res) => {
  let userinfo = await getUserInfo(req.body.id);
  console.log(userinfo);
  // console.log(products, req.body.name);
  res.status(200).send({userInfo: [userinfo]})
})

// found this function online :)
function handleDuplicates(original, newProduct) {
  const updated = { ...original };

  for (const key in newProduct) {
    if (updated.hasOwnProperty(key)) {
      let counter = 1;
      while (updated.hasOwnProperty(`${key}(${counter})`)) {
        counter++;
      }
      updated[`${key}(${counter})`] = newProduct[key];
    } else {
      updated[key] = newProduct[key];
    }
  }

  return updated;
}

function dontHandleDuplicates(original, newProduct) {
  const updated = { ...original };

  for (const key in newProduct) {
    updated[key] = newProduct[key];
  }

  return updated;
}

app.post('/api/addproduct', async (req, res) => {
  console.log(req.body.id, JSON.parse(req.header("Product")), 'info')
  var originalData = await getProduct(req.body.id);
  // if the original product is null or doesn't exist, just set a new object
  // note: try catch could be bad practice here
  try {
    var originalProduct = JSON.parse(originalData)["products"];
    var originalImage = JSON.parse(originalData)["imageLink"];
    const newProduct = JSON.parse(req.header("Product"))["products"];
    const newImage = JSON.parse(req.header("Product"))["imageLink"];
    const updatedProducts = handleDuplicates(originalProduct, newProduct);
    const updatedImages = dontHandleDuplicates(originalImage, newImage);
    console.log(updatedProducts, updatedImages);
    const data = {
      username: req.body.name,
      products: updatedProducts,
      imageLink: updatedImages
    }
    db.set(req.body.id, JSON.stringify(data)).then(() => {})
    res.status(202).send({ data })
  // there's a catch because just in case the user has added NO products yet, it will add the default stuff here
  } catch {
    console.log('DATA CATCHED');
    const givenData = JSON.parse(req.header("Product"));
    const newProduct = givenData["products"];
    const newImage = givenData["imageLink"];
    const data = {
      username: req.body.name,
      products: newProduct,
      imageLink: newImage
    }
    db.set(req.body.id, JSON.stringify(data)).then(() => {})
    res.status(200).send({ data })
  }
})

app.post('/api/deleteproduct', async (req, res) => {
  console.log(req.header("Product"));
  console.log(req.body, req.header("Product"), JSON.parse(req.header("Product")));

  const givenData = JSON.parse(req.header("Product"));
  const productsGiven = givenData["products"].slice(givenData["products"].indexOf(' ') + 3, givenData["products"].indexOf('$') - 1);
  console.log('given', productsGiven)
  const productId = req.body.id;
  
  var originalUserProducts = await getProduct(productId);
  var userProducts = JSON.parse(originalUserProducts)["products"];
  var userImages = JSON.parse(originalUserProducts)["imageLink"];
  // check if product is in user products
  console.log(Object.keys(userProducts), Object.keys(userProducts).indexOf(productsGiven), productsGiven);
  let indexToDelete = Object.keys(userProducts).indexOf(productsGiven);
  if (Object.keys(userProducts).indexOf(productsGiven) != -1) {
    delete userProducts[productsGiven];
    
    let keys = Object.keys(userImages);
    
    let keyToDelete = keys[indexToDelete];
    delete userImages[keyToDelete];
    
    const data = {
      username: req.body.name,
      products: userProducts,
      imageLink: userImages
    }
    db.set(productId, JSON.stringify(data)).then(() => {})
    res.status(200).send({ data })
  } else {
    res.status(501)
  }
  // if (userProducts.hasOwnProperty(productName)) {
  //   delete userProducts[productName];
  //   const data = {
  //     username: req.body.username,
  //     products: userProducts
  //   }
  //   db.set(productId, JSON.stringify(data)).then(() => {})
  //   res.status(200).send({ data })
  // } else {
  //   res.status(404).send({ error: 'Product not found' })
  // }
})

// TODO
app.put('/api/updateproduct', async (req, res) => {
  const productId = req.body.id; // the id of the product to update
  const productName = req.body.name; // the name of the product to update
  const newProductData = req.body.newData; // the new data for the product

  var userProducts = await getProduct(productId);
  userProducts = JSON.parse(userProducts)["products"];

  if (userProducts.hasOwnProperty(productName)) {
    userProducts[productName] = newProductData;
    const data = {
      username: req.body.username,
      products: userProducts
    }
    db.set(productId, JSON.stringify(data)).then(() => {})
    res.status(200).send({ data })
  } else {
    res.status(404).send({ error: 'Product not found' })
  }
})

app.post('/api/adduser', async (req, res) => {
  console.log(req.body);
  const data = {
    username: req.body.name,
    products: {
      "basil plant": "0.01"
    }
  }
  db.get(req.body.id).then(value => {if (value != null) {
    // db.set(req.body.id, JSON.stringify(data)).then(() => {})
    res.status(500).send({ error: "user taken" });
  } else {
    db.set(req.body.id, JSON.stringify(data)).then(() => {})
    res.status(200);
  }})
  // res.json({ message: JSON.parse(req.body).username });
});


// TODO
// app.post('/api/deleteuser', async (req, res) => {
//   let product = await getProduct(req.body.id);
//   res.status(200).send({ productType: product})
// })

app.listen(3000, () => {
  console.log('Express server initialized');
});
