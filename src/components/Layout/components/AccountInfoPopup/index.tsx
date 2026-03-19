import { Space, Divider, Button, DialogPlugin, Avatar, MessagePlugin, Typography, Row } from "tdesign-react"
import { useAuth } from "../../../../auth/context"
import { useNavigate } from "react-router-dom"
const { Text } = Typography
import "./index.less"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faHistory, faQuestionCircle, faLink, faAngleRight } from '@fortawesome/free-solid-svg-icons'

type ActionBtnValue = 'delete-account' | 'logout'

const actionBtns = [
  {
    content: '注销账号',
    theme: 'danger' as const,
    class: 'btn-deleteAccount',
    value: 'delete-account' as ActionBtnValue,
  },
  {
    content: '退出登录',
    theme: 'default' as const,
    class: 'btn-logout',
    value: 'logout' as ActionBtnValue,
  }
]

const cells = [
  {
    label: '用户中心',
    value: 'userCenter',
    icon: <FontAwesomeIcon  icon={faUser} size="lg" />,
    arrow: false,
  },
  {
    label: '更新日志',
    value: 'changelog',
    icon: <FontAwesomeIcon  icon={faHistory} size="lg" />,
    arrow: true,
  },
  {
    label: '帮助中心',
    value: 'help',
    icon: <FontAwesomeIcon  icon={faQuestionCircle} size="lg" />,
    arrow: true,
  },
  {
    label: '进入官网',
    value: 'website',
    icon: <FontAwesomeIcon  icon={faLink} size="lg" />,
    arrow: true,
  },
]

const AccountInfoPopup: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout, deleteAccount } = useAuth()
  const displayName = user?.nickname || user?.username || '未登录';

  const handleActionBtnClick = async (data: ActionBtnValue) => {
    if (data === 'delete-account') {
      const dialog = DialogPlugin.alert({
        header: '提示',
        children: '注销后账号及相关归属数据将不可恢复，请确认继续。',
        theme: 'danger',
        confirmBtn: '注销',
        onConfirm: async() => {
          try {
            await deleteAccount()
            navigate('/login', { replace: true })
            MessagePlugin.info('注销成功')
          } catch {
            MessagePlugin.error('注销失败')
          } finally {
            dialog.destroy()
          }
        },
        onCancel() {
          dialog.destroy()
        },
        onCloseBtnClick() {
          dialog.destroy()
        }
      })
      return 
    }

    if (data === 'logout') {
      await logout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="account-info">
      <Space size={16} align="center">
        <Avatar size="36px" shape="circle">{displayName.slice(0, 2)}</Avatar>
        <Text strong>{displayName}</Text>
      </Space>
      <Divider size={8}/>
      {
        cells.map(cell => (
          <Row key={cell.value} className="cell-item" justify="space-between">
            <div className="cell-item_left">
              <div className="icon">{cell.icon}</div>
              <div className="label">{cell.label}</div>
            </div>
            {
              cell.arrow && <FontAwesomeIcon icon={faAngleRight} size="sm" />
            }
          </Row>
        ))
      }
      <div className="action-btns">
        {
          actionBtns.map(btn => (
            <Button
              key={btn.value}
              className={btn.class}
              theme={btn.theme}
              variant="text"
              content={btn.content}
              onClick={() => handleActionBtnClick(btn.value)}
            />
          ))
        }
      </div>
    </div>
  )
}

export default AccountInfoPopup
