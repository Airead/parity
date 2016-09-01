import BigNumber from 'bignumber.js';
import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import Api from '../../api';
import { eip20Abi, registryAbi, tokenRegAbi } from '../../services/abi';
import Errors from '../../ui/Errors';
import Tooltips from '../../ui/Tooltips';
import { FirstRun } from '../../modals';

import AppContainer from './AppContainer';
import FrameError from './FrameError';
import Status, { updateStatus } from './Status';
import TabBar from './TabBar';

import styles from './style.css';

const api = new Api(new Api.Transport.Http('/rpc/'));
const inFrame = window.parent !== window && window.parent.frames.length !== 0;

const ETH_TOKEN = {
  images: {
    small: '/images/contracts/ethereum-32.png',
    normal: '/images/contracts/ethereum-56.png'
  },
  name: 'Ethereum',
  tag: 'ΞTH'
};

let lastBlockNumber = new BigNumber(-1);

class Application extends Component {
  static childContextTypes = {
    api: PropTypes.object,
    accounts: PropTypes.array,
    contacts: PropTypes.array,
    contracts: PropTypes.array,
    tokens: PropTypes.array
  }

  static propTypes = {
    children: PropTypes.node,
    onUpdateStatus: PropTypes.func
  }

  state = {
    showFirstRun: false,
    accounts: [],
    contacts: [],
    contracts: [],
    tokens: []
  }

  componentWillMount () {
    this.retrieveAccounts();
    this.retrieveTokens();
    this.pollStatus();
  }

  render () {
    const { children } = this.props;
    const { showFirstRun } = this.state;
    const [root] = (window.location.hash || '').replace('#/', '').split('/');

    if (inFrame) {
      return (
        <FrameError />
      );
    } else if (root === 'app') {
      return (
        <AppContainer
          children={ children } />
      );
    }

    return (
      <div className={ styles.container }>
        <FirstRun
          visible={ showFirstRun }
          onClose={ this.onCloseFirst } />
        <Tooltips />
        <Errors />
        <TabBar />
        { children }
        <Status />
      </div>
    );
  }

  getChildContext () {
    const { accounts, contacts, contracts, tokens } = this.state;

    return {
      api,
      accounts,
      contacts,
      contracts,
      tokens
    };
  }

  retrieveAccounts = () => {
    const nextTimeout = () => setTimeout(this.retrieveAccounts, 1000);

    Promise
      .all([
        api.personal.listAccounts(),
        api.personal.accountsInfo()
      ])
      .then(([addresses, infos]) => {
        const contacts = [];
        const accounts = [];

        Object.keys(infos).forEach((address) => {
          const { name, meta, uuid } = infos[address];

          if (uuid) {
            const account = this.state.accounts.find((_account) => _account.uuid === uuid) || {
              address,
              uuid,
              balances: [],
              txCount: 0
            };

            accounts.push(Object.assign(account, {
              meta,
              name
            }));
          } else {
            const contact = this.state.contacts.find((_contact) => _contact.address === address) || {
              address
            };

            contacts.push(Object.assign(contact, {
              meta,
              name
            }));
          }
        });

        this.setState({
          accounts,
          contacts,
          showFirstRun: accounts.length === 0
        }, nextTimeout);
      })
      .catch((error) => {
        console.error('retrieveAccounts', error);

        nextTimeout();
      });
  }

  retrieveBalances = () => {
    const { accounts, tokens } = this.state;

    return Promise
      .all(
        accounts.map((account) => {
          const { address } = account;

          return Promise.all([
            api.eth.getBalance(address),
            api.eth.getTransactionCount(address)
          ]);
        })
      )
      .then((balancesTxCounts) => {
        return Promise.all(
          balancesTxCounts.map(([balance, txCount], idx) => {
            const account = accounts[idx];

            account.txCount = txCount.sub(0x100000); // WHY?
            account.balances = [{
              token: ETH_TOKEN,
              value: balance.toString()
            }];

            return Promise.all(
              tokens.map((token) => {
                return token.contract.instance.balanceOf.call({}, [account.address]);
              })
            );
          })
        );
      })
      .then((balances) => {
        accounts.forEach((account, idx) => {
          const balanceOf = balances[idx];

          tokens.forEach((token, tidx) => {
            account.balances.push({
              token,
              value: balanceOf[tidx].toString()
            });
          });
        });

        this.setState({
          accounts
        });
      })
      .catch((error) => {
        console.error('retrieveBalances', error);
      });
  }

  retrieveTokens = () => {
    const contracts = {};
    const tokens = [];

    api.ethcore
      .registryAddress()
      .then((registryAddress) => {
        contracts.registry = api.newContract(registryAbi, registryAddress);

        return contracts.registry.instance.getAddress.call({}, [Api.format.sha3('tokenreg'), 'A']);
      })
      .then((tokenregAddress) => {
        contracts.tokenreg = api.newContract(tokenRegAbi, tokenregAddress);

        return contracts.tokenreg.instance.tokenCount.call();
      })
      .then((tokenCount) => {
        const promises = [];

        while (promises.length < tokenCount.toNumber()) {
          promises.push(contracts.tokenreg.instance.token.call({}, [promises.length]));
        }

        return Promise.all(promises);
      })
      .then((_tokens) => {
        return Promise.all(
          _tokens.map((token) => {
            const contract = api.newContract(eip20Abi);
            contract.at(token[0]);

            tokens.push({
              address: token[0],
              format: token[2].toString(),
              images: {
                small: `/images/contracts/${token[3].toLowerCase()}-32.png`,
                normal: `/images/contracts/${token[3].toLowerCase()}-56.png`
              },
              supply: '0',
              tag: token[1],
              name: token[3],
              contract
            });

            return contract.instance.totalSupply.call();
          })
        );
      })
      .then((supplies) => {
        supplies.forEach((supply, idx) => {
          tokens[idx].supply = supply.toString();
        });

        this.setState({
          tokens,
          contracts: Object.keys(contracts).map((name) => {
            const contract = contracts[name];

            return {
              name,
              contract,
              address: contract.address
            };
          }).concat(tokens)
        }, this.retrieveBalances);
      })
      .catch((error) => {
        console.error('retrieveTokens', error);
      });
  }

  pollStatus () {
    const { onUpdateStatus } = this.props;
    const nextTimeout = () => setTimeout(() => this.pollStatus(), 1000);

    Promise
      .all([
        api.eth.blockNumber(),
        api.web3.clientVersion(),
        api.ethcore.netChain(),
        api.ethcore.netPeers(),
        api.eth.syncing()
      ])
      .then(([blockNumber, clientVersion, netChain, netPeers, syncing]) => {
        if (blockNumber.gt(lastBlockNumber)) {
          lastBlockNumber = blockNumber;
          this.retrieveBalances();
        }

        onUpdateStatus({
          blockNumber,
          clientVersion,
          netChain,
          netPeers,
          syncing
        });

        nextTimeout();
      })
      .catch((error) => {
        console.error('pollStatus', error);

        nextTimeout();
      });
  }

  onCloseFirst = () => {
    this.setState({
      showFirstRun: false
    });
  }
}

function mapStateToProps (state) {
  return {};
}

function mapDispatchToProps (dispatch) {
  return bindActionCreators({
    onUpdateStatus: updateStatus
  }, dispatch);
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Application);
