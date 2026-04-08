import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveDocumentTitle } from '../utils/documentTitle';

/** 挂载在路由根布局，随 pathname/search 更新 document.title */
const DocumentTitleSync: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = resolveDocumentTitle(location.pathname, location.search);
  }, [location.pathname, location.search]);

  return null;
};

export default DocumentTitleSync;
