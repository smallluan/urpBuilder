import React, { useState } from 'react';
import { Input, Button, Popup, Table } from 'tdesign-react';
import { columns as buildColumns } from './config';
import { AddIcon, SearchIcon } from 'tdesign-icons-react';
import './style.less';

// columns are imported from ./config as `buildColumns`

const mockResults = [
  { id: 1, text: 'Button 组件' },
  { id: 2, text: 'Input 组件' },
  { id: 3, text: 'Table 组件' },
];

const BuildComponent: React.FC = () => {
  const [query, setQuery] = useState('');
  const [popupVisible, setPopupVisible] = useState(false);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (value) setPopupVisible(true);
    else setPopupVisible(false);
  };

  const handleCreate = () => {
    // 在新窗口打开创建组件页面（无 Layout）
    const url = `${window.location.origin}/create-component`;
    window.open(url, '_blank');
  };

  return (
    <div className="build-component">
      <div className="top-row">
        <div className="search-area">
          <Popup
            visible={popupVisible}
            destroyOnClose={false}
            placement="bottom-left"
            content={
              <div className="search-popup">
                {mockResults.map((r) => (
                  <div key={r.id} className="search-item">
                    {r.text}
                  </div>
                ))}
              </div>
            }
          >
            <Input
              placeholder="搜索组件"
              value={query}
              onChange={(val) => handleInputChange(String(val))}
              suffix={<SearchIcon />}
              clearable
            />
          </Popup>
        </div>

        <div className="action-area">
          <Button theme="primary" onClick={handleCreate} icon={<AddIcon />}>
            创建新组件
          </Button>
        </div>
      </div>

      <div className="table-wrapper">
        <Table
          columns={buildColumns}
          data={[]}
          rowKey="id"
          pagination={{
            pageSize: 10,
            total: 0,
          }}
          style={{ minWidth: '1200px' }}
        />
      </div>
    </div>
  );
};

export default BuildComponent;