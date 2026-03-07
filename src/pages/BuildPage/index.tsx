import React, { useState } from 'react';
import { Input, Button, Popup, Table } from 'tdesign-react';
import { AddIcon, SearchIcon } from 'tdesign-icons-react';
import { columns as pageColumns } from '../BuildComponent/config';
import './style.less';

const mockResults = [
  { id: 1, text: 'Home 页面' },
  { id: 2, text: 'Dashboard 页面' },
  { id: 3, text: 'Profile 页面' },
];

const BuildPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [popupVisible, setPopupVisible] = useState(false);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setPopupVisible(Boolean(value));
  };

  const handleCreate = () => {
    const url = `${window.location.origin}/create-page`;
    window.open(url, '_blank');
  };

  return (
    <div className="build-page">
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
              placeholder="搜索页面"
              value={query}
              onChange={(val) => handleInputChange(String(val))}
              suffix={<SearchIcon />}
              clearable
            />
          </Popup>
        </div>

        <div className="action-area">
          <Button theme="primary" onClick={handleCreate} icon={<AddIcon />}>
            创建新页面
          </Button>
        </div>
      </div>

      <div className="table-wrapper">
        <Table
          columns={pageColumns}
          data={[]}
          rowKey="id"
          pagination={{ pageSize: 10, total: 0 }}
          style={{ minWidth: '1200px' }}
        />
      </div>
    </div>
  );
};

export default BuildPage;