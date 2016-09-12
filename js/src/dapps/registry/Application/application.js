import React, { Component, PropTypes } from 'react';

import getMuiTheme from 'material-ui/styles/getMuiTheme';
import lightBaseTheme from 'material-ui/styles/baseThemes/lightBaseTheme';
const muiTheme = getMuiTheme(lightBaseTheme);

import CircularProgress from 'material-ui/CircularProgress';
import styles from './application.css';
import Lookup from '../Lookup';
import Events from '../events';
import Status from '../Status';

export default class Application extends Component {
  static childContextTypes = {
    muiTheme: PropTypes.object
  };
  getChildContext () {
    return { muiTheme };
  }

  render () {
    const { contract, fee, owner, actions } = this.props;

    return (
      <div>
        <h1 className={ styles.title }>RΞgistry</h1>
        { contract && fee && owner
          ? (
            <div>
              <Lookup lookup={ this.props.lookup } actions={ actions.lookup } />
              <Events events={ this.props.events } actions={ actions.events } />
              <Status address={ contract.address } owner={ owner } />
            </div>
          ) : <CircularProgress size={ 1 } />
        }
      </div>
    );
  }

}

Application.propTypes = {
  contract: PropTypes.object,
  fee: PropTypes.object,
  owner: PropTypes.string
};
