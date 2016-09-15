// Copyright 2015, 2016 Ethcore (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

import React, { Component, PropTypes } from 'react';

import styles from './identityIcon.css';

export default class IdentityIcon extends Component {
  static contextTypes = {
    api: PropTypes.object.isRequired
  }

  static propTypes = {
    address: PropTypes.string,
    button: PropTypes.bool,
    className: PropTypes.string,
    center: PropTypes.bool,
    padded: PropTypes.bool,
    inline: PropTypes.bool,
    tokens: PropTypes.object
  }

  state = {
    iconsrc: ''
  }

  componentDidMount () {
    const { address } = this.props;

    this.updateIcon(address);
  }

  componentWillReceiveProps (newProps) {
    const { address, tokens } = this.props;

    if (newProps.address === address && newProps.tokens === tokens) {
      return;
    }

    this.updateIcon(newProps.address);
  }

  updateIcon (_address) {
    const { api } = this.context;
    const { button, tokens, inline } = this.props;
    const token = (tokens || {})[_address];

    if (token && token.image) {
      this.setState({
        iconsrc: token.image
      });

      return;
    }

    let scale = 7;
    if (button) {
      scale = 3;
    } else if (inline) {
      scale = 4;
    }

    this.setState({
      iconsrc: api.util.createIdentityImg(_address, scale)
    });
  }

  render () {
    const { button, className, center, inline, padded } = this.props;
    const { iconsrc } = this.state;
    const classes = `${styles.icon} ${center ? styles.center : styles.left} ${padded ? styles.padded : ''} ${inline ? styles.inline : ''} ${button ? styles.button : ''} ${className}`;

    let size = '56px';
    if (button) {
      size = '24px';
    } else if (inline) {
      size = '32px';
    }

    return (
      <img
        className={ classes }
        src={ iconsrc }
        width={ size }
        height={ size } />
    );
  }
}
