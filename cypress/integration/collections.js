// <reference types="cypress" />
import faker from "faker";

import Product from "../apiRequests/Product";
import Collections from "../apiRequests/storeFront/Collections";
import Search from "../apiRequests/storeFront/Search";
import CollectionsSteps from "../steps/collectionsSteps";
import { urlList } from "../url/urlList";
import * as channelsUtils from "../utils/channelsUtils";
import CollectionsUtils from "../utils/collectionsUtils";
import * as productsUtils from "../utils/productsUtils";
import * as shippingUtils from "../utils/shippingUtils";
import {
  isCollectionVisible,
  isProductInCollectionVisible
} from "../utils/storeFront/collectionsUtils";
import { isProductVisibleInSearchResult } from "../utils/storeFront/storeFrontProductUtils";

describe("Collections", () => {
  const productRequest = new Product();
  const collectionsRequest = new Collections();
  const search = new Search();
  const collectionsUtils = new CollectionsUtils();
  const collectionsSteps = new CollectionsSteps();

  const startsWith = "Cy-";
  const name = `${startsWith}${faker.random.number()}`;

  let attribute;
  let productType;
  let category;

  let defaultChannel;

  before(() => {
    cy.clearSessionData().loginUserViaRequest();
    productsUtils.deleteProperProducts(startsWith);
    collectionsUtils.deleteProperCollections(startsWith);
    shippingUtils.deleteShipping(startsWith);

    channelsUtils
      .getDefaultChannel()
      .then(channel => {
        defaultChannel = channel;
        productsUtils.createTypeAttributeAndCategoryForProduct(name);
      })
      .then(() => {
        attribute = productsUtils.getAttribute();
        productType = productsUtils.getProductType();
        category = productsUtils.getCategory();
        productsUtils.createProductInChannel({
          name,
          channelId: defaultChannel.id,
          productTypeId: productType.id,
          attributeId: attribute.id,
          categoryId: category.id
        });
      });
  });

  beforeEach(() => {
    cy.clearSessionData().loginUserViaRequest();
  });

  it("should not display hidden collections", () => {
    const collectionName = `${startsWith}${faker.random.number()}`;
    cy.visit(urlList.collections);
    let collection;

    collectionsSteps
      .createCollection(collectionName, false, defaultChannel)
      .then(collectionResp => {
        collection = collectionResp;
        collectionsSteps.assignProductsToCollection(name);
      })
      .then(() => {
        collectionsRequest.getCollection(collection.id, defaultChannel.slug);
      })
      .then(resp => {
        const isVisible = isCollectionVisible(resp, collection.id);
        expect(isVisible).to.equal(false);
      });
  });

  it("should display collections", () => {
    const collectionName = `${startsWith}${faker.random.number()}`;
    let collection;
    cy.visit(urlList.collections);
    collectionsSteps
      .createCollection(collectionName, true, defaultChannel)
      .then(collectionResp => {
        collection = collectionResp;
        collectionsSteps.assignProductsToCollection(name);
        collectionsRequest.getCollection(collection.id, defaultChannel.slug);
      })
      .then(resp => {
        const isVisible = isCollectionVisible(resp, collection.id);
        expect(isVisible).to.equal(true);
      });
  });
  it("should not display collection not set as available in channel", () => {
    const collectionName = `${startsWith}${faker.random.number()}`;
    let collection;

    channelsUtils
      .createChannel({ name: collectionName })
      .then(() => {
        productRequest.updateChannelInProduct(
          productsUtils.getCreatedProduct().id,
          channelsUtils.getCreatedChannel().id
        );
      })
      .then(() => {
        cy.visit(urlList.collections);
        collectionsSteps.createCollection(
          collectionName,
          true,
          channelsUtils.getCreatedChannel()
        );
      })
      .then(collectionResp => {
        collection = collectionResp;
        collectionsSteps.assignProductsToCollection(name);
        collectionsRequest.getCollection(collection.id, defaultChannel.slug);
      })
      .then(resp => {
        const isVisible = isCollectionVisible(resp, collection.id);
        expect(isVisible).to.equal(false);
      });
  });
  it("should display products hidden in listing", () => {
    // Products "hidden in listings" are not displayed in Category listings or search results,
    // but are listed on Collections
    const randomName = `${startsWith}${faker.random.number()}`;
    let collection;

    productsUtils.createProductInChannel({
      name: randomName,
      channelId: defaultChannel.id,
      productTypeId: productType.id,
      attributeId: attribute.id,
      categoryId: category.id,
      visibleInListings: false
    });
    cy.visit(urlList.collections);
    collectionsSteps
      .createCollection(randomName, true, defaultChannel)
      .then(collectionResp => {
        collection = collectionResp;
        collectionsSteps.assignProductsToCollection(randomName);
      })
      .then(() => {
        collectionsRequest.getCollection(collection.id, defaultChannel.slug);
      })
      .then(resp => {
        const isVisible = isProductInCollectionVisible(
          resp,
          productsUtils.getCreatedProduct().id
        );
        expect(isVisible).to.equal(true);
      })
      .then(() => {
        search.searchInShop(productsUtils.getCreatedProduct().name);
      })
      .then(resp => {
        const isVisible = isProductVisibleInSearchResult(
          resp,
          productsUtils.getCreatedProduct().name
        );
        expect(isVisible).to.equal(false);
      });
  });
});