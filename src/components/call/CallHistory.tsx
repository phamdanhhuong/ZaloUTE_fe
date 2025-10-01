import React, { useState, useEffect } from 'react';
import { 
  Card, 
  List, 
  Avatar, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Input, 
  Select, 
  DatePicker, 
  Empty,
  Tooltip,
  Pagination,
  Spin
} from 'antd';
import { 
  PhoneOutlined, 
  VideoCameraOutlined, 
  ClockCircleOutlined,
  SearchOutlined,
  UserOutlined,
  RedoOutlined
} from '@ant-design/icons';
import { Call, CallType, CallStatus, CallDirection } from '@/types/call';
import { useCall } from '@/hooks/useCall';
import { CallButton } from './CallButton';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import './CallHistory.module.css';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface CallHistoryProps {
  userId?: string;
  showActions?: boolean;
  compact?: boolean;
  pageSize?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const CallHistory: React.FC<CallHistoryProps> = ({
  userId,
  showActions = true,
  compact = false,
  pageSize = 10,
  style,
  className
}) => {
  const { getCallHistory, isLoading, initiateCall } = useCall();
  
  // State
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<CallStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<CallType | 'all'>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [loading, setLoading] = useState(false);

  // Load call history
  const loadCallHistory = async () => {
    setLoading(true);
    try {
      const history = await getCallHistory();
      setCalls(history);
      setFilteredCalls(history);
    } catch (error) {
      console.error('Failed to load call history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCallHistory();
  }, []);

  // Filter calls based on search and filters
  useEffect(() => {
    let filtered = calls;

    // Text search
    if (searchText) {
      filtered = filtered.filter(call => {
        // You would implement actual user name search here
        return call._id.toLowerCase().includes(searchText.toLowerCase()) ||
               call.callerId.toLowerCase().includes(searchText.toLowerCase()) ||
               call.receiverId.toLowerCase().includes(searchText.toLowerCase());
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(call => call.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(call => call.callType === typeFilter);
    }

    // Date range filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      filtered = filtered.filter(call => {
        const callDate = dayjs(call.createdAt);
        return callDate.isAfter(dateRange[0]) && callDate.isBefore(dateRange[1]);
      });
    }

    // Filter by user if specified
    if (userId) {
      filtered = filtered.filter(call => 
        call.callerId === userId || call.receiverId === userId
      );
    }

    setFilteredCalls(filtered);
    setCurrentPage(1);
  }, [calls, searchText, statusFilter, typeFilter, dateRange, userId]);

  // Get call direction for current user
  const getCallDirection = (call: Call): CallDirection => {
    if (!userId) return CallDirection.OUTGOING;
    return call.callerId === userId ? CallDirection.OUTGOING : CallDirection.INCOMING;
  };

  // Get other participant ID
  const getOtherParticipant = (call: Call): string => {
    if (!userId) return call.receiverId;
    return call.callerId === userId ? call.receiverId : call.callerId;
  };

  // Format call duration
  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get status tag color
  const getStatusColor = (status: CallStatus): string => {
    switch (status) {
      case CallStatus.ACCEPTED: return 'green';
      case CallStatus.ENDED: return 'blue';
      case CallStatus.REJECTED: return 'red';
      case CallStatus.MISSED: return 'orange';
      case CallStatus.FAILED: return 'red';
      default: return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (call: Call) => {
    const direction = getCallDirection(call);
    const isIncoming = direction === CallDirection.INCOMING;
    
    if (call.callType === CallType.VIDEO) {
      return <VideoCameraOutlined style={{ color: '#1890ff' }} />;
    }
    
    return (
      <PhoneOutlined 
        style={{ 
          color: call.status === CallStatus.ACCEPTED ? '#52c41a' : 
                call.status === CallStatus.MISSED ? '#faad14' : '#f5222d',
          transform: isIncoming ? 'rotate(135deg)' : 'none'
        }} 
      />
    );
  };

  // Handle call back
  const handleCallBack = async (call: Call) => {
    const otherParticipant = getOtherParticipant(call);
    try {
      await initiateCall(otherParticipant, call.callType);
    } catch (error) {
      console.error('Failed to call back:', error);
    }
  };

  // Paginated calls
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCalls = filteredCalls.slice(startIndex, startIndex + pageSize);

  const renderCallItem = (call: Call) => {
    const direction = getCallDirection(call);
    const otherParticipant = getOtherParticipant(call);
    const isIncoming = direction === CallDirection.INCOMING;

    return (
      <List.Item
        key={call._id}
        className={`call-history-item ${compact ? 'compact' : ''}`}
        actions={showActions ? [
          <Tooltip title="Call back">
            <Button
              type="text"
              icon={<RedoOutlined />}
              onClick={() => handleCallBack(call)}
              size="small"
            />
          </Tooltip>,
          <CallButton
            userId={otherParticipant}
            userName={`User ${otherParticipant}`}
            compact={true}
          />
        ] : undefined}
      >
        <List.Item.Meta
          avatar={
            <div className="call-avatar-container">
              <Avatar 
                size={compact ? 40 : 48}
                icon={<UserOutlined />}
                className={`call-avatar ${direction}`}
              />
              <div className="call-type-badge">
                {getStatusIcon(call)}
              </div>
            </div>
          }
          title={
            <div className="call-title">
              <Space>
                <Text strong>{`User ${otherParticipant}`}</Text>
                <Tag 
                  color={getStatusColor(call.status)}
                >
                  {call.status}
                </Tag>
                {isIncoming && <Tag>Incoming</Tag>}
              </Space>
            </div>
          }
          description={
            <div className="call-description">
              <Space direction="vertical" size={2}>
                <Text type="secondary">
                  <ClockCircleOutlined /> {dayjs(call.createdAt).fromNow()}
                </Text>
                {call.duration > 0 && (
                  <Text type="secondary">
                    Duration: {formatDuration(call.duration)}
                  </Text>
                )}
                {call.failureReason && (
                  <Text type="danger">
                    Reason: {call.failureReason}
                  </Text>
                )}
              </Space>
            </div>
          }
        />
      </List.Item>
    );
  };

  return (
    <Card 
      className={`call-history-card ${className || ''}`}
      style={style}
      title={
        <div className="call-history-header">
          <Title level={4} style={{ margin: 0 }}>
            📞 Call History
          </Title>
          <Button
            icon={<RedoOutlined />}
            onClick={loadCallHistory}
            loading={loading}
            type="text"
          />
        </div>
      }
    >
      {/* Filters */}
      <div className="call-history-filters">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Search
            placeholder="Search calls..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '100%' }}
            allowClear
          />
          
          <Space wrap style={{ width: '100%' }}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ minWidth: 120 }}
              size="small"
            >
              <Option value="all">All Status</Option>
              <Option value={CallStatus.ACCEPTED}>Accepted</Option>
              <Option value={CallStatus.ENDED}>Ended</Option>
              <Option value={CallStatus.REJECTED}>Rejected</Option>
              <Option value={CallStatus.MISSED}>Missed</Option>
              <Option value={CallStatus.FAILED}>Failed</Option>
            </Select>

            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ minWidth: 100 }}
              size="small"
            >
              <Option value="all">All Types</Option>
              <Option value={CallType.VOICE}>Voice</Option>
              <Option value={CallType.VIDEO}>Video</Option>
            </Select>

            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              size="small"
              placeholder={['Start Date', 'End Date']}
              allowClear
            />
          </Space>
        </Space>
      </div>

      {/* Call List */}
      <div className="call-history-list">
        <Spin spinning={loading || isLoading}>
          {filteredCalls.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                calls.length === 0 ? 'No call history' : 'No calls match your filters'
              }
            />
          ) : (
            <>
              <List
                dataSource={paginatedCalls}
                renderItem={renderCallItem}
                size={compact ? 'small' : 'default'}
              />
              
              {filteredCalls.length > pageSize && (
                <div className="call-history-pagination">
                  <Pagination
                    current={currentPage}
                    total={filteredCalls.length}
                    pageSize={pageSize}
                    onChange={setCurrentPage}
                    showSizeChanger={false}
                    showTotal={(total, range) => 
                      `${range[0]}-${range[1]} of ${total} calls`
                    }
                    size="small"
                  />
                </div>
              )}
            </>
          )}
        </Spin>
      </div>
    </Card>
  );
};