const Product = require("../models/Product");
const faker = require('faker');

const randomizeType = () => {
  let n = (Math.random() * 10).toFixed();

  if (n % 2 === 0) {
    return 'ring'
  } else {
    return 'coll'
  }
}

module.exports = seeder = async () => {
  for (let i = 0; i < 10; i++) {
    const p = new Product({
      title: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      type: randomizeType(),
      category: (Math.random() * 10).toFixed() % 2 === 0 ? 'gold' : 'silver',
      gallery: [
        '/img/ani1.jpg',
        '/img/ani2.jpg',
        '/img/ani3.jpg',
        '/img/ani4.jpg',
        '/img/ani5.jpg',
      ],
      mainImg: '/img/ani3.jpg',
      thumbImg: '/img/ani5.jpg',
      price: +faker.commerce.price(),
      availableMessures: [6, 7, 8, 9, 10, 11, 12],
      isOnMainPage: i % 2 === 0 ? true : false,
      karat: (Math.random() * (24 - 5 + 1) + 5).toFixed() + 'K',
    });
    await p.save();
  }
}
