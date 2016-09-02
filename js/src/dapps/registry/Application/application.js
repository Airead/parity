import React, { Component, PropTypes } from 'react';

import getMuiTheme from 'material-ui/styles/getMuiTheme';
import lightBaseTheme from 'material-ui/styles/baseThemes/lightBaseTheme';

import registryAbi from '../abi/registry.json';
import Loading from '../Loading';
import Status from '../Status';

const { api } = window.parity;

const muiTheme = getMuiTheme(lightBaseTheme);

export default class Application extends Component {
  static childContextTypes = {
    instance: PropTypes.object,
    muiTheme: PropTypes.object
  }

  state = {
    address: null,
    fee: null,
    instance: null,
    loading: true,
    owner: null
  }

  componentDidMount () {
    this.attachInterface();
  }

  render () {
    const { address, fee, loading, owner } = this.state;

    if (loading) {
      return (
        <Loading />
      );
    }

    return (
      <div>
        <Status
          address={ address }
          fee={ fee }
          owner={ owner } />
      </div>
    );
  }

  getChildContext () {
    return {
      instance: this.state.instance,
      muiTheme
    };
  }

  onNewBlockNumber = (blockNumber) => {
    const { instance } = this.state;

    instance.fee
      .call()
      .then((fee) => {
        this.setState({
          fee
        });
      });
  }

  attachInterface = () => {
    api.ethcore
      .registryAddress()
      .then((address) => {
        console.log(`registry found at ${address}`);
        const { instance } = api.newContract(registryAbi, address);

        return Promise
          .all([
            instance.owner.call(),
            instance.fee.call()
          ])
          .then(([owner, fee]) => {
            console.log(`owner as ${owner}, fee set at ${fee.toFormat()}`);
            this.setState({
              address,
              fee,
              instance,
              loading: false,
              owner
            });

            api.events.subscribe('eth.blockNumber', this.onNewBlockNumber);
          });
      })
      .catch((error) => {
        console.error(error);
      });
  }
}
