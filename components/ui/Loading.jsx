import React from 'react';
import PropTypes from 'prop-types';

const Loading = ({ label = 'Loading' }) => (
  <output className="flex items-center justify-center p-8">
    <span
      aria-hidden="true"
      className="block h-10 w-10 animate-spin rounded-full border-2 border-rule border-t-ink"
    ></span>
    <span className="sr-only">{label}</span>
  </output>
);

Loading.propTypes = {
  label: PropTypes.string
};

export default Loading;
