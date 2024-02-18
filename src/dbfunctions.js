import Database from '@replit/database';

const db = new Database()

export async function getProduct(id) {
  var product = await db.get(id);
  return product
}

export async function getUserInfo(id) {
  var product = await db.get(id);
  return JSON.parse(product)
}

export async function getAllProducts() {
  var productKeys = [];
  var productPrices = [];
  var userNames = [];
  var productImages = [];
  var keys = await db.list();
  var products = await Promise.all(keys.map(async (item) => {
    var value = await db.get(item);
    value = JSON.parse(value);
    console.log(value, 'valuefound');
    productKeys.push(Object.keys(value["products"]));
    productPrices.push(Object.values(value["products"]));
    userNames.push(Object.values(value["username"]));
    productImages.push(value["imageLink"])
    // productImages.push('huh you got here')
  }));
  return [productKeys, productPrices, userNames, productImages];
}