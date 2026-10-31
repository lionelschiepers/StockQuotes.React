import React from 'react';
import PropTypes from 'prop-types';

const Loading = ({ label = 'Loading' }) => (
  <div role="status" className="flex items-center justify-center p-8">
    <div
      aria-hidden="true"
      className="h-10 w-10 animate-spin rounded-full border-2 border-rule border-t-ink"
    ></div>
    <span className="sr-only">{label}</span>
  </div>
);

Loading.propTypes = {
  label: PropTypes.string
};

export default Loading;
