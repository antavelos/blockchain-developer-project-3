import Web3 from "web3";
import supplyChainArtifact from "../../build/contracts/SupplyChain.json";

const emptyAddress = "0x0000000000000000000000000000000000000000"

const parseError = err => {
  try {
    return err.message.split('message')[1].split('code')[0].slice(3).slice(0, -3)
  } catch {
    return err.message;
  }
};

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

const App = {
  web3: null,
  account: null,
  meta: null,
  accountIsFarmer: false,
  accountIsDistributor: false,
  accountIsRetailer: false,
  accountIsConsumer: false,

  // elements
  $upcFetchInputButton: document.getElementById("upcFetchInputButton"),
  $upcFetchInput: document.getElementById("upcFetchInput"),
  $newHarvestButton: document.getElementById("newHarvestButton"),
  $newHarvestSaveButton: document.getElementById("newHarvestSaveButton"),
  newHarvestModal: new bootstrap.Modal('#newHarvestModal'),
  successToast: new bootstrap.Toast('#successToast'),
  $successToastBody: document.getElementById('successToastBody'),
  errorToast: new bootstrap.Toast('#errorToast'),
  $errorToastBody: document.getElementById('errorToastBody'),

  // new harvest form elements
  $newHarvestUPC: document.getElementById("newHarvestUPC"),
  $newHarvestProductNotes: document.getElementById("newHarvestProductNotes"),
  $newHarvestFarmName: document.getElementById("newHarvestFarmName"),
  $newHarvestFarmInfo: document.getElementById("newHarvestFarmInfo"),
  $newHarvestLatitude: document.getElementById("newHarvestFarmLatitude"),
  $newHarvestLongitude: document.getElementById("newHarvestFarmLongitude"),

  // item details elements
  $itemSKU: document.getElementById('itemSKU'),
  $itemUPC: document.getElementById('itemUPC'),
  $itemProductPrice: document.getElementById('itemProductPrice'),
  $itemState: document.getElementById('itemState'),
  $itemFarmName: document.getElementById('itemFarmName'),
  $itemFarmInfo: document.getElementById('itemFarmInfo'),
  $itemFarmLatitude: document.getElementById('itemFarmLatitude'),
  $itemFarmLongitude: document.getElementById('itemFarmLongitude'),
  $itemFarmer: document.getElementById('itemFarmer'),
  $itemDistributor: document.getElementById('itemDistributor'),
  $itemRetailer: document.getElementById('itemRetailer'),
  $itemConsumer: document.getElementById('itemConsumer'),
  $itemFarmerIsOwner: document.getElementById('itemFarmerIsOwner'),
  $itemDistributorIsOwner: document.getElementById('itemDistributorIsOwner'),
  $itemRetailerIsOwner: document.getElementById('itemRetailerIsOwner'),
  $itemConsumerIsOwner: document.getElementById('itemConsumerIsOwner'),

  // action buttons
  $processButton: document.getElementById('processButton'),
  $packButton: document.getElementById('packButton'),
  $sellButton: document.getElementById('sellButton'),
  $buyButton: document.getElementById('buyButton'),
  $shipButton: document.getElementById('shipButton'),
  $receiveButton: document.getElementById('receiveButton'),
  $purchaseButton: document.getElementById('purchaseButton'),

  currentItem: {},
  SupplyChainContract: null,

  showErrorToast: (message) => {
    App.$errorToastBody.setHTML(message);
    App.errorToast.show();
  },

  showSuccessToast: (message) => {
    App.$successToastBody.setHTML(message);
    App.successToast.show();
  },

  showItem: (item) => {
    App.$itemSKU.value = item.sku;
    App.$itemUPC.value = item.upc;
    App.$itemProductPrice.value = item.productPrice;
    App.$itemState.value = stateToString(item.itemState);
    App.$itemFarmName.value = item.originFarmName;
    App.$itemFarmInfo.value = item.originFarmInformation;
    App.$itemFarmLatitude.value = item.originFarmLatitude;
    App.$itemFarmLongitude.value = item.originFarmLongitude;
    App.$itemFarmer.value = item.originFarmerID;
    App.$itemDistributor.value = item.distributorID;
    App.$itemRetailer.value = item.retailerID;
    App.$itemConsumer.value = item.consumerID;

    App.$itemFarmerIsOwner.hidden = item.originFarmerID !== item.ownerID;
    App.$itemDistributorIsOwner.hidden = item.distributorID !== item.ownerID;
    App.$itemRetailerIsOwner.hidden = item.retailerID !== item.ownerID;
    App.$itemConsumerIsOwner.hidden = item.consumerID !== item.ownerID;

    const state = parseInt(item.itemState)
    // App.$processButton.hidden = !App.accountIsFarmer;
    App.$processButton.disabled = state >= 1;

    // App.$packButton.hidden = !App.accountIsFarmer;
    App.$packButton.disabled = state >= 2 || state < 1;

    // App.$sellButton.hidden = !App.accountIsFarmer;
    App.$sellButton.disabled = state >= 3 || state < 2;

    // App.$buyButton.hidden = !App.accountIsDistributor;
    App.$buyButton.disabled = state >= 4 || state < 3;

    // App.$shipButton.hidden = !App.accountIsDistributor;
    App.$shipButton.disabled = state >= 5 || state < 4;

    // App.$receiveButton.hidden = !App.accountIsRetailer;
    App.$receiveButton.disabled = state >= 6 || state < 5;

    // App.$purchaseButton.hidden = !App.accountIsConsumer;
    App.$purchaseButton.disabled = state >= 7 || state < 6;
  },

  initSupplyChain: async function () {
      const { web3 } = this;

      try {
        // get contract instance
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = supplyChainArtifact.networks[networkId];
        App.SupplyChainContract = new web3.eth.Contract(
          supplyChainArtifact.abi,
          deployedNetwork.address,
        );

        // get accounts
        const accounts = await web3.eth.getAccounts();
        console.log(accounts)
        this.account = accounts[0];
        // await App.SupplyChainContract.methods.addFarmer(accounts[0]).call();
        // await App.SupplyChainContract.methods.addDistributor(accounts[1]).call();
        // await App.SupplyChainContract.methods.addFarmer(accounts[2]).call();
        // await App.SupplyChainContract.methods.addFarmer(accounts[3]).call();
        // App.accountIsFarmer = await App.SupplyChainContract.methods.isFarmer(App.account).call();
        // App.accountIsDistributor = await App.SupplyChainContract.methods.isDistributor(App.account).call();
        // App.accountIsRetailer = await App.SupplyChainContract.methods.isRetailer(App.account).call();
        // App.accountIsConsumer = await App.SupplyChainContract.methods.isConsumer(App.account).call();
      } catch (error) {
        console.error("Could not connect to contract or chain.", error);
      }
      App.fetchEvents();
  },
  bindEvents: function() {
    App.$upcFetchInputButton.addEventListener("click", App.fetchItem,);
    App.$newHarvestButton.addEventListener("click", () => App.newHarvestModal.show());
    App.$newHarvestSaveButton.addEventListener("click", App.harvestItem);
    App.$processButton.addEventListener("click", App.processItem);
    App.$packButton.addEventListener("click", App.packItem);
    App.$sellButton.addEventListener("click", App.sellItem);
    App.$buyButton.addEventListener("click", App.buyItem);
    App.$shipButton.addEventListener("click", App.shipItem);
    App.$receiveButton.addEventListener("click", App.receiveItem);
    App.$purchaseButton.addEventListener("click", App.purchaseItem);
  },

  harvestItem: function() {
    const upc = parseInt(App.$newHarvestUPC.value);

    App.SupplyChainContract.methods.harvestItem(
      upc,
      App.$newHarvestFarmName.value,
      App.$newHarvestFarmInfo.value,
      App.$newHarvestLatitude.value,
      App.$newHarvestLongitude.value,
      App.$newHarvestProductNotes.value,
    )
    .send({from: App.account})
    .then((res) => {
      App.newHarvestModal.hide();
      console.log(res);
      App.showSuccessToast('Item was successfully harvested');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      console.error(err)
      App.showErrorToast(parseError(err));
    });
  },

  processItem: () => {
    const upc = parseInt(App.$itemUPC.value);

    App.SupplyChainContract.methods.processItem(upc)
    .send({from: App.account})
    .then((res) => {
      console.log(res);
      App.showSuccessToast('Item was successfully processed');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  packItem: () => {
    const upc = parseInt(App.$itemUPC.value);

    App.SupplyChainContract.methods.packItem(upc)
    .send({from: App.account})
    .then((res) => {
      console.log(res);
      App.showSuccessToast('Item was successfully packed');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  sellItem: () => {
    const upc = parseInt(App.$itemUPC.value);
    const price = Web3.utils.toWei("1", "ether");

    App.SupplyChainContract.methods.sellItem(upc, price)
    .send({from: App.account})
    .then((res) => {
      console.log(res);
      App.showSuccessToast('Item was successfully put for sale');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  buyItem: () => {
    const upc = parseInt(App.$itemUPC.value);

    App.SupplyChainContract.methods.buyItem(upc)
    .send({from: App.account, value: Web3.utils.toWei("1", "ether")})
    .then((res) => {
      console.log(res);
      App.showSuccessToast('Item was successfully bought');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  shipItem: () => {
    const upc = parseInt(App.$itemUPC.value);

    App.SupplyChainContract.methods.shipItem(upc)
    .send({from: App.account})
    .then((res) => {
      console.log(res);
      App.showSuccessToast('Item was successfully shipped');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  receiveItem: () => {
    const upc = parseInt(App.$itemUPC.value);

    App.SupplyChainContract.methods.receiveItem(upc)
    .send({from: App.account})
    .then((res) => {
      console.log(res);
      App.showSuccessToast('Item was successfully received');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  purchaseItem: () => {
    const upc = parseInt(App.$itemUPC.value);

    App.SupplyChainContract.methods.purchaseItem(upc)
    .send({from: App.account})
    .then((res) => {
      console.log(res);
      App.showSuccessToast('Item was successfully purschased');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.newHarvestModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  fetchItem: () => {
    event.preventDefault();
    const upc = parseInt(App.$upcFetchInput.value);
    App._fetchItem(upc);
  },

  _fetchItem: (upc) => {
    App.SupplyChainContract.methods.fetchItem(upc).call()
    .then(res => {
      App.currentItem = res;
      console.log(res);
      App.showItem(App.currentItem);
    }).catch(err => {
      console.error(err);
      App.showErrorToast(parseError(err.message));
    });
  },

  fetchEvents: () => {
    console.log('fetching events');
    App.SupplyChainContract.events.allEvents(function(err, log){
      console.log(log.event, log.transactionHash);
      if (!err) {
        $("#ftc-events").append('<li>' + log.event + ' - ' + log.transactionHash + '</li>');
      }
    });
  },

  start: async function() {
    App.bindEvents();
    await App.initSupplyChain();
  },

};

window.App = App;

window.addEventListener("load", function() {
  if (window.ethereum) {
    // use MetaMask's provider
    App.web3 = new Web3(window.ethereum);
    window.ethereum.enable(); // get permission to access accounts
  } else {
    console.warn(
      "No web3 detected. Falling back to http://127.0.0.1:8545. You should remove this fallback when you deploy live",
    );
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    App.web3 = new Web3(
      new Web3.providers.HttpProvider("http://127.0.0.1:8545"),
    );
  }

  App.start();
});
