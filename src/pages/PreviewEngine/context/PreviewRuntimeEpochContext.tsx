import React from 'react';

/** dataHub 等在父级 useEffect 中创建后递增，子组件依赖此值可在外层就绪后重新执行拉数逻辑。 */
export const PreviewRuntimeEpochContext = React.createContext(0);
