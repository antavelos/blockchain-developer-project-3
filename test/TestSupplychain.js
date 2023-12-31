// This script is designed to test the solidity smart contract - SuppyChain.sol -- and the various functions within
// Declare a variable and assign the compiled smart contract artifact
var SupplyChain = artifacts.require('SupplyChain')
var FarmerRole = artifacts.require('FarmerRole')
var DistributorRole = artifacts.require('DistributorRole')
var RetailerRole = artifacts.require('RetailerRole')
var ConsumerRole = artifacts.require('ConsumerRole')

const oneEtherInWei = web3.utils.toWei("1", "ether");

const stateToString = (state) => {
    if (state == 0) {
        return "Harvested";
    } else if (state == 1) {
        return "Processed";
    } else if (state == 2) {
        return "Packed";
    } else if (state == 3) {
        return "ForSale";
    } else if (state == 4) {
        return "Sold";
    } else if (state == 5) {
        return "Shipped";
    } else if (state == 6) {
        return "Received";
    } else if (state == 7) {
        return "Purchased";
    }
};

const fullError = msg => `VM Exception while processing transaction: revert ${msg}`;

contract('SupplyChain', accounts => {
    // Declare few constants and assign a few sample accounts generated by ganache-cli
    const upc = 1;
    const delayedUPC = 42;
    const sku = 2;
    const ownerID = accounts[0];
    const originFarmerID = accounts[1];
    const originFarmName = "John Doe";
    const originFarmInformation = "Yarray Valley";
    const originFarmLatitude = "-38.239770";
    const originFarmLongitude = "144.341490";
    const productID = sku + upc;
    const productNotes = "Best beans for Espresso";
    const productImageIPFSHash = "QmXExS4BMc1YrH6iWERyryFcDWkvobxryXSwECLrcd7Y1H";
    const productPrice = oneEtherInWei;
    const distributorID = accounts[2];
    const retailerID = accounts[3];
    const consumerID = accounts[4];
    const altFarmerID = accounts[5];
    const altDistributorID = accounts[6];
    const altRetailerID = accounts[7];
    const altConsumerID = accounts[8];


    const emptyAddress = '0x0000000000000000000000000000000000000000'

    const assertUnaffectedItemAttrs = item => {
        assert.equal(item.sku, sku, 'Error: Invalid item SKU');
        assert.equal(item.upc, upc, 'Error: Invalid item UPC');
        assert.equal(item.originFarmName, originFarmName, 'Error: Missing or Invalid originFarmName');
        assert.equal(item.originFarmInformation, originFarmInformation, 'Error: Missing or Invalid originFarmInformation');
        assert.equal(item.originFarmLatitude, originFarmLatitude, 'Error: Missing or Invalid originFarmLatitude');
        assert.equal(item.originFarmLongitude, originFarmLongitude, 'Error: Missing or Invalid originFarmLongitude');
        assert.equal(item.productID, productID, 'Error: Missing or Invalid productID');
        assert.equal(item.productNotes, productNotes, 'Error: Missing or Invalid productNotes');
    }

    console.log("ganache-cli accounts used here...")
    console.log("Contract Owner: accounts[0] ", accounts[0])
    console.log("Farmer: accounts[1] ", accounts[1])
    console.log("Distributor: accounts[2] ", accounts[2])
    console.log("Retailer: accounts[3] ", accounts[3])
    console.log("Consumer: accounts[4] ", accounts[4])

    describe("Tests | SupplyChain contract functions", async () => {

        before(async () => {
            const supplyChain = await SupplyChain.deployed();
            await supplyChain.addFarmer(originFarmerID, {from: ownerID});
            await supplyChain.addFarmer(altFarmerID, {from: ownerID});
            await supplyChain.addDistributor(distributorID, {from: ownerID});
            await supplyChain.addDistributor(altDistributorID, {from: ownerID});
            await supplyChain.addRetailer(retailerID, {from: ownerID});
            await supplyChain.addRetailer(altRetailerID, {from: ownerID});
            await supplyChain.addConsumer(consumerID, {from: ownerID});
            await supplyChain.addConsumer(altConsumerID, {from: ownerID});
            await supplyChain.harvestItem(
                delayedUPC,
                originFarmName,
                originFarmInformation,
                originFarmLatitude,
                originFarmLongitude,
                productNotes,
                productImageIPFSHash,
                {from: originFarmerID}
            );
        });

        it("harvestItem(): allows a farmer to harvest coffee", async () => {
            const supplyChain = await SupplyChain.deployed();

            // non-farmer account is not allowed
            supplyChain.harvestItem(
                upc,
                originFarmName,
                originFarmInformation,
                originFarmLatitude,
                originFarmLongitude,
                productNotes,
                productImageIPFSHash,
                {from: consumerID}
                )
                .catch(err => {
                    assert.equal(err.message,  fullError("not a farmer"));
                });

                // harvest product as a farmer
                await supplyChain.harvestItem(
                    upc,
                    originFarmName,
                    originFarmInformation,
                    originFarmLatitude,
                    originFarmLongitude,
                    productNotes,
                    productImageIPFSHash,
                {from: originFarmerID}
            );

            const fetchedItem = await supplyChain.fetchItem.call(upc);

            // assert the stored item
            assertUnaffectedItemAttrs(fetchedItem);
            assert.equal(fetchedItem.ownerID, originFarmerID, 'Error: Missing or Invalid ownerID');
            assert.equal(fetchedItem.originFarmerID, originFarmerID, 'Error: Missing or Invalid originFarmerID');
            assert.equal(fetchedItem.productPrice, 0, 'Error: Missing or Invalid productPrice');
            assert.equal(fetchedItem.distributorID, emptyAddress, 'Error: Missing or Invalid distributorID');
            assert.equal(fetchedItem.retailerID, emptyAddress, 'Error: Missing or Invalid retailerID');
            assert.equal(fetchedItem.consumerID, emptyAddress, 'Error: Missing or Invalid consumerID');
            assert.equal(stateToString(fetchedItem.itemState), 'Harvested', 'Error: Invalid item State');

            // a relevant event should have taken place
            supplyChain.getPastEvents('Harvested').then(events => {
                assert.equal(events.length, 1);
                assert.equal(events[0].logIndex, 0);
                assert.equal(parseInt(events[0].returnValues['upc']), upc);
            });

            // harvesting a product with existing upc should fail
            supplyChain.harvestItem(
                upc,
                originFarmName,
                originFarmInformation,
                originFarmLatitude,
                originFarmLongitude,
                productNotes,
                productImageIPFSHash,
                {from: originFarmerID}
            )
            .catch(err => {
                assert.equal(err.message, fullError("upc already exists"));
            });
        });

        it("processItem(): allows a farmer to process coffee", async() => {
            const supplyChain = await SupplyChain.deployed();

            // non-farmer account is not allowed
            supplyChain.processItem(upc, {from: distributorID})
            .catch(err => {
                assert.equal(err.message, fullError("not a farmer"));
            });

            // not original farmer account is not allowed
            supplyChain.processItem(upc, {from: altFarmerID})
            .catch(err => {
                assert.equal(err.message, fullError("sender is not the original farmer"));
            });

            // process item as a farmer
            await supplyChain.processItem(upc, {from: originFarmerID});

            const fetchedItem = await supplyChain.fetchItem.call(upc);

            // assert the updated item
            assertUnaffectedItemAttrs(fetchedItem);
            assert.equal(fetchedItem.ownerID, originFarmerID, 'Error: Missing or Invalid ownerID');
            assert.equal(fetchedItem.originFarmerID, originFarmerID, 'Error: Missing or Invalid originFarmerID');
            assert.equal(fetchedItem.productPrice, 0, 'Error: Missing or Invalid productPrice');
            assert.equal(fetchedItem.distributorID, emptyAddress, 'Error: Missing or Invalid distributorID');
            assert.equal(fetchedItem.retailerID, emptyAddress, 'Error: Missing or Invalid retailerID');
            assert.equal(fetchedItem.consumerID, emptyAddress, 'Error: Missing or Invalid consumerID');
            assert.equal(stateToString(fetchedItem.itemState), 'Processed', 'Error: Invalid item State');

            // a relevant event should have taken place
            supplyChain.getPastEvents('Processed').then(events => {
                assert.equal(events.length, 1);
                assert.equal(events[0].logIndex, 0);
                assert.equal(parseInt(events[0].returnValues['upc']), upc);
            });
        });

        it("packItem(): allows a farmer to pack coffee", async() => {
            const supplyChain = await SupplyChain.deployed();

            // non-farmer account is not allowed
            supplyChain.packItem(upc, {from: distributorID})
            .catch(err => {
                assert.equal(err.message, fullError("not a farmer"));
            });

            // not original farmer account is not allowed
            supplyChain.packItem(upc, {from: altFarmerID})
            .catch(err => {
                assert.equal(err.message, fullError("sender is not the original farmer"));
            });

            // cannot pack unprocessed item
            supplyChain.packItem(delayedUPC, {from: originFarmerID})
            .catch(err => {
                assert.equal(err.message, fullError("item is not processed yet"));
            });

            // pack the item as the original farmer
            await supplyChain.packItem(upc, {from: originFarmerID});

            const fetchedItem = await supplyChain.fetchItem.call(upc);

            // assert the updated item
            assertUnaffectedItemAttrs(fetchedItem);
            assert.equal(fetchedItem.ownerID, originFarmerID, 'Error: Missing or Invalid ownerID');
            assert.equal(fetchedItem.originFarmerID, originFarmerID, 'Error: Missing or Invalid originFarmerID');
            assert.equal(fetchedItem.productPrice, 0, 'Error: Missing or Invalid productPrice');
            assert.equal(fetchedItem.distributorID, emptyAddress, 'Error: Missing or Invalid distributorID');
            assert.equal(fetchedItem.retailerID, emptyAddress, 'Error: Missing or Invalid retailerID');
            assert.equal(fetchedItem.consumerID, emptyAddress, 'Error: Missing or Invalid consumerID');
            assert.equal(stateToString(fetchedItem.itemState), 'Packed', 'Error: Invalid item State');

            // a relevant event should have taken place
            supplyChain.getPastEvents('Packed').then(events => {
                assert.equal(events.length, 1);
                assert.equal(events[0].logIndex, 0);
                assert.equal(parseInt(events[0].returnValues['upc']), upc);
            });
        });

        it("sellItem(): allows a farmer to sell coffee", async() => {
            const supplyChain = await SupplyChain.deployed();

            // non-farmer account is not allowed
            supplyChain.sellItem(upc, productPrice, {from: distributorID})
            .catch(err => {
                assert.equal(err.message, fullError("not a farmer"));
            });

            // not original farmer account is not allowed
            supplyChain.sellItem(upc, productPrice, {from: altFarmerID})
            .catch(err => {
                assert.equal(err.message, fullError("sender is not the original farmer"));
            });

            // cannot sell unpacked item
            supplyChain.sellItem(delayedUPC, productPrice, {from: originFarmerID})
            .catch(err => {
                assert.equal(err.message, fullError("item is not packed yet"));
            });

            // sell the item as the original farmer
            await supplyChain.sellItem(upc, productPrice, {from: originFarmerID});

            const fetchedItem = await supplyChain.fetchItem.call(upc);

            // assert the updated item
            assertUnaffectedItemAttrs(fetchedItem);
            assert.equal(fetchedItem.ownerID, originFarmerID, 'Error: Missing or Invalid ownerID');
            assert.equal(fetchedItem.originFarmerID, originFarmerID, 'Error: Missing or Invalid originFarmerID');
            assert.equal(fetchedItem.productPrice, productPrice, 'Error: Missing or Invalid productPrice');
            assert.equal(fetchedItem.distributorID, emptyAddress, 'Error: Missing or Invalid distributorID');
            assert.equal(fetchedItem.retailerID, emptyAddress, 'Error: Missing or Invalid retailerID');
            assert.equal(fetchedItem.consumerID, emptyAddress, 'Error: Missing or Invalid consumerID');
            assert.equal(stateToString(fetchedItem.itemState), 'ForSale', 'Error: Invalid item State');

            // a relevant event should have taken place
            supplyChain.getPastEvents('ForSale').then(events => {
                assert.equal(events.length, 1);
                assert.equal(events[0].logIndex, 0);
                assert.equal(parseInt(events[0].returnValues['upc']), upc);
            });
        });

        it("buyItem(): allows a distributor to buy coffee", async() => {
            const supplyChain = await SupplyChain.deployed();

            // non-distributor account is not allowed
            supplyChain.buyItem(upc, {from: retailerID})
            .catch(err => {
                assert.equal(err.message, fullError("not a distributor"));
            });

            // cannot sell unsold item
            supplyChain.buyItem(delayedUPC, {from: distributorID})
            .catch(err => {
                assert.equal(err.message, fullError("item is not for sale yet"));
            });

            // buy item as a distributor
            await supplyChain.buyItem(upc, {from: distributorID, value: oneEtherInWei});

            const fetchedItem = await supplyChain.fetchItem.call(upc);

            // assert the updated item
            assertUnaffectedItemAttrs(fetchedItem);
            assert.equal(fetchedItem.ownerID, distributorID, 'Error: Missing or Invalid ownerID');
            assert.equal(fetchedItem.originFarmerID, originFarmerID, 'Error: Missing or Invalid originFarmerID');
            assert.equal(fetchedItem.productPrice, productPrice, 'Error: Missing or Invalid productPrice');
            assert.equal(fetchedItem.distributorID, distributorID, 'Error: Missing or Invalid distributorID');
            assert.equal(fetchedItem.retailerID, emptyAddress, 'Error: Missing or Invalid retailerID');
            assert.equal(fetchedItem.consumerID, emptyAddress, 'Error: Missing or Invalid consumerID');
            assert.equal(stateToString(fetchedItem.itemState), 'Sold', 'Error: Invalid item State');

            // a relevant event should have taken place
            supplyChain.getPastEvents('Sold').then(events => {
                assert.equal(events.length, 1);
                assert.equal(events[0].logIndex, 0);
                assert.equal(parseInt(events[0].returnValues['upc']), upc);
            });
        });

        it("shipItem(): allows a distributor to ship coffee", async() => {
            const supplyChain = await SupplyChain.deployed();

            // not original distributor account is not allowed
            supplyChain.shipItem(upc, {from: altDistributorID})
            .catch(err => {
                assert.equal(err.message, fullError("sender is not the original distributor"));
            });

            // ship item as the original distributor
            await supplyChain.shipItem(upc, {from: distributorID});

            const fetchedItem = await supplyChain.fetchItem.call(upc);

            // assert the updated item
            assertUnaffectedItemAttrs(fetchedItem);
            assert.equal(fetchedItem.ownerID, distributorID, 'Error: Missing or Invalid ownerID');
            assert.equal(fetchedItem.originFarmerID, originFarmerID, 'Error: Missing or Invalid originFarmerID');
            assert.equal(fetchedItem.productPrice, productPrice, 'Error: Missing or Invalid productPrice');
            assert.equal(fetchedItem.distributorID, distributorID, 'Error: Missing or Invalid distributorID');
            assert.equal(fetchedItem.retailerID, emptyAddress, 'Error: Missing or Invalid retailerID');
            assert.equal(fetchedItem.consumerID, emptyAddress, 'Error: Missing or Invalid consumerID');
            assert.equal(stateToString(fetchedItem.itemState), 'Shipped', 'Error: Invalid item State');

            // a relevant event should have taken place
            supplyChain.getPastEvents('Shipped').then(events => {
                assert.equal(events.length, 1);
                assert.equal(events[0].logIndex, 0);
                assert.equal(parseInt(events[0].returnValues['upc']), upc);
            });
        });

        it("receiveItem(): allows a retailer to mark coffee received", async() => {
            const supplyChain = await SupplyChain.deployed();

            // non-retailer account is not allowed
            supplyChain.receiveItem(upc, {from: consumerID})
            .catch(err => {
                assert.equal(err.message, fullError("not a retailer"));
            });

            // cannot receive unshipped item
            supplyChain.receiveItem(delayedUPC, {from: retailerID})
            .catch(err => {
                assert.equal(err.message, fullError("item is not shipped yet"));
            });

            // receive the item as a retailer
            await supplyChain.receiveItem(upc, {from: retailerID});

            const fetchedItem = await supplyChain.fetchItem.call(upc);

            // assert the updated item
            assertUnaffectedItemAttrs(fetchedItem);
            assert.equal(fetchedItem.ownerID, retailerID, 'Error: Missing or Invalid ownerID');
            assert.equal(fetchedItem.originFarmerID, originFarmerID, 'Error: Missing or Invalid originFarmerID');
            assert.equal(fetchedItem.productPrice, productPrice, 'Error: Missing or Invalid productPrice');
            assert.equal(fetchedItem.distributorID, distributorID, 'Error: Missing or Invalid distributorID');
            assert.equal(fetchedItem.retailerID, retailerID, 'Error: Missing or Invalid retailerID');
            assert.equal(fetchedItem.consumerID, emptyAddress, 'Error: Missing or Invalid consumerID');
            assert.equal(stateToString(fetchedItem.itemState), 'Received', 'Error: Invalid item State');

            // a relevant event should have taken place
            supplyChain.getPastEvents('Received').then(events => {
                assert.equal(events.length, 1);
                assert.equal(events[0].logIndex, 0);
                assert.equal(parseInt(events[0].returnValues['upc']), upc);
            });
        });

        it("purchaseItem(): allows a consumer to purchase coffee", async() => {
            const supplyChain = await SupplyChain.deployed();

            // non-consumer account is not allowed
            supplyChain.purchaseItem(upc, {from: originFarmerID})
            .catch(err => {
                assert.equal(err.message, fullError("not a consumer"));
            });

            // cannot purchase unreceived item
            supplyChain.purchaseItem(delayedUPC, {from: consumerID})
            .catch(err => {
                assert.equal(err.message, fullError("item is not received yet by the retailer"));
            });

            // purchase item as consumer
            await supplyChain.purchaseItem(upc, {from: consumerID});

            const fetchedItem = await supplyChain.fetchItem.call(upc);

            // assert updated item
            assertUnaffectedItemAttrs(fetchedItem);
            assert.equal(fetchedItem.ownerID, consumerID, 'Error: Missing or Invalid ownerID');
            assert.equal(fetchedItem.originFarmerID, originFarmerID, 'Error: Missing or Invalid originFarmerID');
            assert.equal(fetchedItem.productPrice, productPrice, 'Error: Missing or Invalid productPrice');
            assert.equal(fetchedItem.distributorID, distributorID, 'Error: Missing or Invalid distributorID');
            assert.equal(fetchedItem.retailerID, retailerID, 'Error: Missing or Invalid retailerID');
            assert.equal(fetchedItem.consumerID, consumerID, 'Error: Missing or Invalid consumerID');
            assert.equal(stateToString(fetchedItem.itemState), 'Purchased', 'Error: Invalid item State');

            // a relevant event should have taken place
            supplyChain.getPastEvents('Purchased').then(events => {
                assert.equal(events.length, 1);
                assert.equal(events[0].logIndex, 0);
                assert.equal(parseInt(events[0].returnValues['upc']), upc);
            });
        });

        it("fetchItem: allows anyone to fetch item details from blockchain", async() => {
            const supplyChain = await SupplyChain.deployed();

            const fetchedItem = await supplyChain.fetchItem.call(upc);

            assertUnaffectedItemAttrs(fetchedItem);
            assert.equal(fetchedItem.ownerID, consumerID, 'Error: Missing or Invalid ownerID');
            assert.equal(fetchedItem.originFarmerID, originFarmerID, 'Error: Missing or Invalid originFarmerID');
            assert.equal(fetchedItem.productPrice, productPrice, 'Error: Missing or Invalid productPrice');
            assert.equal(fetchedItem.distributorID, distributorID, 'Error: Missing or Invalid distributorID');
            assert.equal(fetchedItem.retailerID, retailerID, 'Error: Missing or Invalid retailerID');
            assert.equal(fetchedItem.consumerID, consumerID, 'Error: Missing or Invalid consumerID');
            assert.equal(stateToString(fetchedItem.itemState), 'Purchased', 'Error: Invalid item State');
        })
    });
});
