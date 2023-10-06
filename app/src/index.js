import Web3 from "web3";
import axios from 'axios';
import supplyChainArtifact from "../../build/contracts/SupplyChain.json";
import secrets from "../secrets.json";

const getById = (id) => document.getElementById(id);

const INFURA_IPFS_API_URL = 'https://ipfs.infura.io:5001/api/v0';
const INFURA_IPFS_GATEWAY_URL = 'https://udacity-blockchain-developer.infura-ipfs.io/ipfs'
const PROJECT_ID = secrets.PROJECT_ID;
const PROJECT_SECRET = secrets.PROJECT_SECRET;

const AccountRoles = {
  Owner: 'Owner',
  Farmer: 'Farmer',
  Distributor: 'Distributor',
  Retailer: 'Retailer',
  Consumer: 'Consumer'
};

const parseError = err => {
  try {
    return err.message.split('message')[1].split('code')[0].slice(3).slice(0, -3)
  } catch {
    return err.message;
  }
};

class ActionButton{
  constructor(el, defaultState, actionName, actionCompletedName, allowedRoles) {
    this.el = el;
    this.defaultState = defaultState;
    this.actionName = actionName;
    this.actionCompletedName = actionCompletedName;
    this.allowedRoles = allowedRoles;
  }

  update(state, roles, isOriginAccount) {
    if (state == this.defaultState - 1) {
      const roleIntersection = this.allowedRoles.filter(r => roles.includes(r));

      roleIntersection.length > 0 && isOriginAccount ? this.enable() : this.reset();
    } else {
      this.reset();
    }
    if (state >= this.defaultState) { this.markCompleted(); }
  }

  reset() {
    this.el.innerHTML = '';
    this.el.disabled = true;
    this.el.classList.remove('btn-primary');
    this.el.classList.add('btn-outline-primary');
    this.el.appendChild(document.createTextNode(this.actionCompletedName + ' '));
    this.el.appendChild(this.createIncompletedIcon());
  }

  enable() {
    this.el.innerHTML = '';
    this.el.appendChild(document.createTextNode(this.actionName + ' '));
    this.el.classList.remove('btn-outline-primary');
    this.el.classList.add('btn-primary');
    this.el.disabled = false;
  }

  createIncompletedIcon() {
    let node = document.createElement("i");
    node.classList.add('bi');
    node.classList.add('bi-square');
    return node;
  }

  createCompletedIcon() {
    let node = document.createElement("i");
    node.classList.add('bi');
    node.classList.add('bi-check-square');
    return node;
  }

  markCompleted() {
    this.el.innerHTML = '';
    this.el.disabled = true;
    this.el.classList.remove('btn-primary');
    this.el.classList.add('btn-outline-primary');
    this.el.appendChild(document.createTextNode(this.actionCompletedName + ' '));
    this.el.appendChild(this.createCompletedIcon());
  }
};

const App = {
  emptyAddress: "0x0000000000000000000000000000000000000000",
  web3: null,
  account: null,
  accountRoles: [],

  // elements
  $currentAccount: getById("currentAccount"),
  $upcFetchInputButton: getById("upcFetchInputButton"),
  $upcFetchInput: getById("upcFetchInput"),
  $newHarvestButton: getById("newHarvestButton"),
  $newHarvestSaveButton: getById("newHarvestSaveButton"),
  newHarvestModal: new bootstrap.Modal('#newHarvestModal'),
  successToast: new bootstrap.Toast('#successToast'),
  $successToastBody: getById('successToastBody'),
  errorToast: new bootstrap.Toast('#errorToast'),
  $errorToastBody: getById('errorToastBody'),
  sellItemModal: new bootstrap.Modal('#sellItemModal'),
  $sellItemConfirmButton: getById('sellItemConfirmButton'),
  $sellItemPrice: getById('sellItemPrice'),

  // new accounts
  newAccountModal: new bootstrap.Modal('#newAccountModal'),
  $newAccountValue: getById('newAccountValue'),
  $newAccountRole: getById('newAccountRole'),
  $newAccountButton: getById('newAccountButton'),
  $newAccountSaveButton: getById('newAccountSaveButton'),

  // new harvest form elements
  $newHarvestUPC: getById("newHarvestUPC"),
  $newHarvestProductNotes: getById("newHarvestProductNotes"),
  $newHarvestFarmName: getById("newHarvestFarmName"),
  $newHarvestFarmInfo: getById("newHarvestFarmInfo"),
  $newHarvestLatitude: getById("newHarvestFarmLatitude"),
  $newHarvestLongitude: getById("newHarvestFarmLongitude"),
  $newHarvestImage: getById("newHarvestImage"),

  // item details elements
  $itemContent: getById('itemContent'),
  $itemSKU: getById('itemSKU'),
  $itemUPC: getById('itemUPC'),
  $itemProductPrice: getById('itemProductPrice'),
  $itemProductNotes: getById('itemProductNotes'),
  $itemFarmName: getById('itemFarmName'),
  $itemFarmInfo: getById('itemFarmInfo'),
  $itemFarmLatitude: getById('itemFarmLatitude'),
  $itemFarmLongitude: getById('itemFarmLongitude'),
  $itemFarmer: getById('itemFarmer'),
  $itemDistributor: getById('itemDistributor'),
  $itemRetailer: getById('itemRetailer'),
  $itemConsumer: getById('itemConsumer'),
  $itemFarmerIsOwner: getById('itemFarmerIsOwner'),
  $itemDistributorIsOwner: getById('itemDistributorIsOwner'),
  $itemRetailerIsOwner: getById('itemRetailerIsOwner'),
  $itemConsumerIsOwner: getById('itemConsumerIsOwner'),
  $txHistoryTable: getById('txHistoryTable'),
  $itemImage: getById('itemImage'),

  // action buttons
  actionButtons: {
    harvestButton: new ActionButton(getById('harvestButton'), 0, 'Harvest', 'Harvested', [AccountRoles.Farmer]),
    processButton: new ActionButton(getById('processButton'), 1, 'Process', 'Processed', [AccountRoles.Farmer]),
    packButton: new ActionButton(getById('packButton'), 2, 'Pack', 'Packed', [AccountRoles.Farmer]),
    sellButton: new ActionButton(getById('sellButton'), 3, 'Sell', 'For sale', [AccountRoles.Farmer]),
    buyButton: new ActionButton(getById('buyButton'), 4, 'Buy', 'Bought', [AccountRoles.Distributor]),
    shipButton: new ActionButton(getById('shipButton'), 5, 'Ship', 'Shipped', [AccountRoles.Distributor]),
    receiveButton: new ActionButton(getById('receiveButton'), 6, 'Receive', 'Received', [AccountRoles.Retailer]),
    purchaseButton: new ActionButton(getById('purchaseButton'), 7, 'Purchase', 'Purchased', [AccountRoles.Consumer]),
  },

  // action button elements
  $processButton: getById('processButton'),
  $processButtonCheck: getById('processButtonCheck'),
  $packButton: getById('packButton'),
  $packButtonCheck: getById('packButtonCheck'),
  $sellButton: getById('sellButton'),
  $sellButtonCheck: getById('sellButtonCheck'),
  $buyButton: getById('buyButton'),
  $buyButtonCheck: getById('buyButtonCheck'),
  $shipButton: getById('shipButton'),
  $shipButtonCheck: getById('shipButtonCheck'),
  $receiveButton: getById('receiveButton'),
  $receiveButtonCheck: getById('receiveButtonCheck'),
  $purchaseButton: getById('purchaseButton'),
  $purchaseButtonCheck: getById('purchaseButtonCheck'),

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
    App.$itemProductNotes.innerHTML = item.productNotes;
    App.$itemFarmName.value = item.originFarmName;
    App.$itemFarmInfo.value = item.originFarmInformation;
    App.$itemFarmLatitude.value = item.originFarmLatitude;
    App.$itemFarmLongitude.value = item.originFarmLongitude;
    App.$itemFarmer.value = item.originFarmerID;
    App.$itemDistributor.value = item.distributorID;
    App.$itemRetailer.value = item.retailerID;
    App.$itemConsumer.value = item.consumerID;
    App.$itemImage.src = './static/image-placeholder.jpg';
    if (item.productImageIPFSHash) {
      App.$itemImage.src = `${INFURA_IPFS_GATEWAY_URL}/${item.productImageIPFSHash}`;
    }

    App.$itemFarmerIsOwner.hidden = item.ownerID === App.emptyAddress || item.originFarmerID !== item.ownerID;
    App.$itemDistributorIsOwner.hidden = item.ownerID === App.emptyAddress || item.distributorID !== item.ownerID;
    App.$itemRetailerIsOwner.hidden = item.ownerID === App.emptyAddress || item.retailerID !== item.ownerID;
    App.$itemConsumerIsOwner.hidden = item.ownerID === App.emptyAddress || item.consumerID !== item.ownerID;

    const itemExists = item.sku != 0;

    if (!itemExists) {
      Object.values(App.actionButtons).forEach(button => button.reset());
      return;
    }

    const currentAccount = App.account.toLowerCase();
    const farmerId = item.originFarmerID.toLowerCase();
    const distributorId = item.distributorID.toLowerCase();
    const state = parseInt(item.itemState);

    App.actionButtons.harvestButton.update(state, App.accountRoles, currentAccount == farmerId);
    App.actionButtons.processButton.update(state, App.accountRoles, currentAccount == farmerId);
    App.actionButtons.packButton.update(state, App.accountRoles, currentAccount == farmerId);
    App.actionButtons.sellButton.update(state, App.accountRoles, currentAccount == farmerId);
    App.actionButtons.buyButton.update(state, App.accountRoles, true);
    App.actionButtons.shipButton.update(state, App.accountRoles, currentAccount == distributorId);
    App.actionButtons.receiveButton.update(state, App.accountRoles, true);
    App.actionButtons.purchaseButton.update(state, App.accountRoles, true);

  },

  showTxHistoryEvent(rowIdx, eventName, txHash) {
    let row = App.$txHistoryTable.insertRow(rowIdx);
    row.insertCell(0).innerHTML = rowIdx + 1;
    row.insertCell(1).innerHTML = `<code><strong>${eventName}</strong></code>`;
    row.insertCell(2).innerHTML = `<code>${txHash}</code>`;
  },

  emptyTxHistory() {
    App.$txHistoryTable.innerHTML = '';
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
      } catch (error) {
        console.error("Could not connect to contract or chain.", error);
      }

      // get accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      App.account = accounts[0];
      App.updateCurrentAccountRoles(App.account);
  },

  getCurrentRoles: async (account) => {
    let roles = [];
    if (await App.SupplyChainContract.methods.isOwner().call({from: account})) {
      roles.push(AccountRoles.Owner);
    }
    if (await App.SupplyChainContract.methods.isFarmer(account).call({from: account})) {
      roles.push(AccountRoles.Farmer);
    }
    if (await App.SupplyChainContract.methods.isDistributor(account).call({from: account})) {
      roles.push(AccountRoles.Distributor);
    }
    if (await App.SupplyChainContract.methods.isRetailer(account).call({from: account})) {
      roles.push(AccountRoles.Retailer)
    }
    if (await App.SupplyChainContract.methods.isConsumer(account).call({from: account})) {
      roles.push(AccountRoles.Consumer);
    }

    return roles;
  },

  updateCurrentAccountRoles: async (account) => {
    App.accountRoles = await App.getCurrentRoles(account);
    App.updateCurrentAccountText(account, App.accountRoles);
  },

  updateCurrentAccountText: async (account, roles) => {
    App.$currentAccount.innerHTML = `Current active account: <strong>${account}</strong> - ${roles.join(' | ')}`;
  },

  bindElementEvents: function() {
    App.$upcFetchInputButton.addEventListener("click", App.fetchItem,);
    App.$newHarvestButton.addEventListener("click", () => App.newHarvestModal.show());
    App.$newHarvestSaveButton.addEventListener("click", App.harvestItem);
    App.$sellButton.addEventListener("click", () => App.sellItemModal.show());
    App.$sellItemConfirmButton.addEventListener("click", App.sellItem);
    App.$processButton.addEventListener("click", App.processItem);
    App.$packButton.addEventListener("click", App.packItem);
    App.$buyButton.addEventListener("click", App.buyItem);
    App.$shipButton.addEventListener("click", App.shipItem);
    App.$receiveButton.addEventListener("click", App.receiveItem);
    App.$purchaseButton.addEventListener("click", App.purchaseItem);

    App.$newAccountButton.addEventListener("click", () => App.newAccountModal.show());
    App.$newAccountSaveButton.addEventListener("click", App.addNewAccount);
  },

  uploadImage(imageFile) {
    return axios.post(`${INFURA_IPFS_API_URL}/add?pin=false`, {
      file: imageFile
    }, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      auth: {
        username: PROJECT_ID,
        password: PROJECT_SECRET
      }
    });
  },

  addNewAccount: () => {
    const account = App.$newAccountValue.value;
    const role = App.$newAccountRole.value;

    const contractMethodsPerRole = {
      'Farmer': App.SupplyChainContract.methods.addFarmer,
      'Distributor': App.SupplyChainContract.methods.addDistributor,
      'Retailer': App.SupplyChainContract.methods.addRetailer,
      'Consumer': App.SupplyChainContract.methods.addConsumer,
    }

    contractMethodsPerRole[role](account)
    .send({from: App.account})
    .then((res) => {
      console.log(res);
      App.newAccountModal.hide();
      App.showSuccessToast(`${role} account was added successfully`);
    })
    .catch((err) => {
      App.newAccountModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  harvestItem: async function() {
    const upc = parseInt(App.$newHarvestUPC.value);
    const imageFile = App.$newHarvestImage.files[0];
    const imageIPFSHash = '';

    if (imageFile) {
      res = await App.uploadImage(imageFile);
      if (res.status != 200) {
        App.showErrorToast('Failed to load image to IPFS');
      } else {
        imageIPFSHash = res.data.Hash;
      }
    }
    App.SupplyChainContract.methods.harvestItem(
      upc,
      App.$newHarvestFarmName.value,
      App.$newHarvestFarmInfo.value,
      App.$newHarvestLatitude.value,
      App.$newHarvestLongitude.value,
      App.$newHarvestProductNotes.value,
      imageIPFSHash,
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
      console.error(err);
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
    const price = App.$sellItemPrice.value
    const priceToWei = Web3.utils.toWei(price, "ether"); // make modal

    App.SupplyChainContract.methods.sellItem(upc, priceToWei)
    .send({from: App.account})
    .then((res) => {
      App.sellItemModal.hide();
      console.log(res);
      App.showSuccessToast('Item was successfully put for sale');
      App._fetchItem(upc);
    })
    .catch((err) => {
      App.sellItemModal.hide();
      App.showErrorToast(parseError(err));
    });
  },

  buyItem: () => {
    const upc = parseInt(App.$itemUPC.value);

    App.SupplyChainContract.methods.buyItem(upc)
    .send({from: App.account, value: App.currentItem.productPrice})
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
    const upc = parseInt(App.$upcFetchInput.value);
    App._fetchItem(upc);
  },

  _fetchItem: (upc) => {
    App.SupplyChainContract.methods.fetchItem(upc).call()
    .then(res => {
      console.log('Fetched item: ', res);
      App.currentItem = res;
      App.showItem(App.currentItem);
      App.fetchItemEventsHistory(upc);
    }).catch(err => {
      console.error(err);
      App.showErrorToast(parseError(err.message));
    });
  },

  fetchItemEventsHistory: async (upc) => {
    const eventList = [
      'Harvested',
      'Processed',
      'Packed',
      'ForSale',
      'Sold',
      'Shipped',
      'Received',
      'Purchased'
    ]
    const options = {fromBlock: 'earliest', toBlock: 'latest'};

    App.emptyTxHistory();
    let count = 0;
    eventList.forEach(async eventName => {
      let events = await App.SupplyChainContract.getPastEvents(eventName, options);
      events = events.filter(e => e.returnValues.upc == upc);
      if (events.length > 0) {
        App.showTxHistoryEvent(count, eventName, events[0].transactionHash);
      }
      count += 1;
    })
  },

  start: async function() {
    await App.initSupplyChain();

    App.bindElementEvents();
  },

};

window.App = App;

window.addEventListener("load", () => {
  if (window.ethereum) {
    // use MetaMask's provider
    App.web3 = new Web3(window.ethereum);
    window.ethereum.enable(); // get permission to access accounts

    window.ethereum.on('accountsChanged', async (accounts) => {
      App.account = accounts[0];
      console.log('Account changed: ', App.account);
      await App.updateCurrentAccountRoles(App.account);
      App.fetchItem();
    });

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
