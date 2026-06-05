import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import { authStorage, channelApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ImageUploadField from '../../components/ui/ImageUploadField';
import FileUploadField from '../../components/ui/FileUploadField';

const typeMap = {
  announcement: { label: 'Thông báo', icon: 'fa-bullhorn', color: 'bg-orange-100 text-orange-700' },
  question: { label: 'Câu hỏi', icon: 'fa-circle-question', color: 'bg-blue-100 text-blue-700' },
  discussion: null,
};

const filterTabs = [
  { value: 'all', label: 'Tất cả', icon: 'fa-list' },
  { value: 'announcement', label: 'Thông báo', icon: 'fa-bullhorn' },
  { value: 'discussion', label: 'Thảo luận', icon: 'fa-comments' },
  { value: 'question', label: 'Câu hỏi', icon: 'fa-circle-question' },
];

function fmt(dt) {
  if (!dt) return '';
  const raw = String(dt);
  const d = new Date(raw.endsWith('Z') || raw.includes('+') ? raw : raw + 'Z');
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 0) return 'Vừa xong';
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return d.toLocaleDateString('vi-VN');
}

function sortPosts(items) {
  return [...items].sort((a, b) => {
    if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return b.isPinned ? 1 : -1;
    const pinA = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
    const pinB = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
    if (pinA !== pinB) return pinB - pinA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function renderMentionText(text) {
  return String(text || '').split(/(@[A-Za-z0-9_]+)/g).map((part, index) => (
    part.startsWith('@')
      ? <span key={`${part}-${index}`} className="font-medium text-primary-600">{part}</span>
      : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
  ));
}

function MentionTextarea({ channelId, value, onChange, rows = 3, placeholder, className, autoFocus }) {
  const inputRef = useRef(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionResults, setMentionResults] = useState([]);

  const handleChange = async (event) => {
    const next = event.target.value;
    onChange(next);

    const cursor = event.target.selectionStart || next.length;
    const beforeCursor = next.slice(0, cursor);
    const match = beforeCursor.match(/@([A-Za-z0-9_]*)$/);
    if (!match) {
      setMentionQuery(null);
      setMentionResults([]);
      return;
    }

    const query = match[1];
    setMentionQuery(query);
    try {
      const response = await channelApi.getMembers(channelId, query);
      setMentionResults(response.data || []);
    } catch {
      setMentionResults([]);
    }
  };

  const insertMention = (member) => {
    const input = inputRef.current;
    const cursor = input?.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursor);
    const afterCursor = value.slice(cursor);
    const nextBefore = beforeCursor.replace(/@([A-Za-z0-9_]*)$/, `@${member.userName} `);
    const next = `${nextBefore}${afterCursor}`;
    onChange(next);
    setMentionQuery(null);
    setMentionResults([]);
    requestAnimationFrame(() => input?.focus());
  };

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleChange}
        rows={rows}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={className}
      />
      {mentionQuery !== null && mentionResults.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-lg border border-warmborder bg-white shadow-lg">
          {mentionResults.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => insertMention(member)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-primary-50"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs text-primary-600">
                <i className="fa-solid fa-user" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-warmink">@{member.userName}</span>
                <span className="block truncate text-xs text-warmink-2">{member.name || 'Thành viên kênh'}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentSection({ channelId, postId, incomingComments = [] }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const mergeComments = (items) => {
    setComments((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      items.forEach((c) => map.set(c.id, c));
      return [...map.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    });
  };

  const load = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const response = await channelApi.getComments(channelId, postId);
      setComments(response.data || []);
      setLoaded(true);
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [postId]);
  useEffect(() => {
    if (incomingComments.length > 0) mergeComments(incomingComments);
  }, [incomingComments]);

  const submit = async (event, parentCommentId = null) => {
    event.preventDefault();
    const content = parentCommentId ? replyText.trim() : text.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      const response = await channelApi.addComment(channelId, postId, { content, parentCommentId });
      mergeComments([response.data]);
      if (parentCommentId) {
        setReplyText('');
        setReplyTo(null);
      } else {
        setText('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Bình luận thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId) => {
    try {
      await channelApi.deleteComment(channelId, postId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentCommentId !== commentId));
    } catch (err) {
      alert(err.response?.data?.message || 'Xóa thất bại');
    }
  };

  const topLevel = comments.filter((c) => !c.parentCommentId);
  const replies = comments.filter((c) => c.parentCommentId);

  if (loading) return <div className="px-4 py-2"><LoadingSpinner size="sm" /></div>;

  const commentNode = (comment, isReply = false) => (
    <div key={comment.id} className={`flex gap-2 group ${isReply ? 'ml-9' : ''}`}>
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
        <i className="fa-solid fa-user text-xs text-primary-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="rounded-xl border border-warmborder bg-white px-3 py-2 shadow-sm">
          <p className="text-xs font-semibold text-warmink">{comment.author?.name || comment.author?.userName || 'Nguoi dung'}</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-warmink-2">{renderMentionText(comment.content)}</p>
        </div>
        <div className="mt-1 flex items-center gap-2 pl-1">
          <span className="text-xs text-warmink-3">{fmt(comment.createdAt)}</span>
          {!isReply && <button type="button" onClick={() => setReplyTo(comment.id)} className="text-xs text-primary-500 hover:text-primary-700">Trả lời</button>}
          {(comment.authorId === user?.id || user?.role === 'Admin') && (
            <button onClick={() => deleteComment(comment.id)} className="text-xs text-red-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100">
              Xóa
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 border-t border-warmborder bg-surface-2 px-4 py-3">
      {topLevel.map((comment) => (
        <div key={comment.id} className="space-y-2">
          {commentNode(comment)}
          {replies.filter((reply) => reply.parentCommentId === comment.id).map((reply) => commentNode(reply, true))}
          {replyTo === comment.id && (
            <form onSubmit={(event) => submit(event, comment.id)} className="ml-9 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Trả lời..."
                className="flex-1 rounded-full border border-warmborder bg-white px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button type="submit" disabled={submitting || !replyText.trim()} className="text-primary-600 disabled:text-warmink-3">
                <i className="fa-solid fa-paper-plane" />
              </button>
            </form>
          )}
        </div>
      ))}

      {user && (
        <form onSubmit={submit} className="flex gap-2">
          <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
            <i className="fa-solid fa-user text-xs text-primary-500" />
          </div>
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Viet binh luan..."
              className="flex-1 rounded-full border border-warmborder bg-white px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button type="submit" disabled={submitting || !text.trim()} className="text-primary-600 hover:text-primary-700 disabled:text-warmink-3">
              <i className="fa-solid fa-paper-plane" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function PollBox({ channelId, poll, onVote }) {
  if (!poll) return null;
  const total = (poll.options || []).reduce((sum, opt) => sum + (opt.voteCount || 0), 0);
  const expired = poll.expiresAt && new Date(poll.expiresAt) < new Date();

  return (
    <div className="mt-3 rounded-lg border border-warmborder bg-surface-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-warmink">{poll.question}</p>
        {expired && <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-warmink-2">Đã đóng</span>}
      </div>
      <div className="mt-2 space-y-2">
        {(poll.options || []).map((option) => {
          const percent = total > 0 ? Math.round(((option.voteCount || 0) / total) * 100) : 0;
          const voted = poll.userVotedOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => !expired && onVote(poll.id, option.id)}
              disabled={expired}
              className={`relative w-full overflow-hidden rounded-lg border p-2 text-left text-sm ${voted ? 'border-primary-400 bg-primary-50' : 'border-warmborder bg-white hover:bg-surface-2'} disabled:cursor-not-allowed`}
            >
              <div className="absolute inset-y-0 left-0 bg-primary-100" style={{ width: `${percent}%` }} />
              <div className="relative flex items-center justify-between gap-3">
                <span>{option.text}</span>
                <span className="text-xs text-warmink-2">{percent}% ({option.voteCount || 0})</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PostCard({ channelId, channel, post, onDelete, onTogglePin, onPollVote, currentUser, incomingComments }) {
  const [liked, setLiked] = useState(post.isLikedByMe || false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [toggling, setToggling] = useState(false);
  const canManage = channel?.event?.organizerId === currentUser?.id || currentUser?.role === 'Admin';
  const canDelete = post.authorId === currentUser?.id || currentUser?.role === 'Admin';
  const typeInfo = typeMap[post.postType] || null;

  useEffect(() => {
    setLiked(post.isLikedByMe || false);
    setLikeCount(post.likeCount || 0);
  }, [post.id, post.isLikedByMe, post.likeCount]);

  const toggleLike = async () => {
    if (toggling) return;
    setToggling(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((count) => wasLiked ? Math.max(0, count - 1) : count + 1);
    try {
      await channelApi.toggleLike(channelId, post.id);
    } catch {
      setLiked(wasLiked);
      setLikeCount((count) => wasLiked ? count + 1 : Math.max(0, count - 1));
    } finally {
      setToggling(false);
    }
  };

  const attachmentIcon = post.attachmentType === 'pdf'
    ? 'fa-file-pdf text-red-500'
    : post.attachmentType === 'docx' || post.attachmentType === 'doc'
      ? 'fa-file-word text-blue-500'
      : post.attachmentType === 'xlsx'
        ? 'fa-file-excel text-green-600'
        : 'fa-file text-warmink-2';

  return (
    <div className="card overflow-hidden">
      {post.isPinned && (
        <div className="flex items-center gap-1.5 border-b border-yellow-100 bg-yellow-50 px-4 py-1.5 text-xs font-medium text-yellow-700">
          <i className="fa-solid fa-thumbtack" /> Bài ghim
        </div>
      )}

      <div className="flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
          <i className="fa-solid fa-user text-primary-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-warmink">{post.author?.name || post.author?.userName || 'Nguoi dung'}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-warmink-3">{fmt(post.createdAt)}</span>
              {canManage && (
                <button onClick={() => onTogglePin(post.id)} className="text-warmink-3 transition-colors hover:text-yellow-500" title={post.isPinned ? 'Bỏ ghim' : 'Ghim'}>
                  <i className={`fa-solid fa-thumbtack text-xs ${post.isPinned ? 'text-yellow-500' : ''}`} />
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete(post.id)} className="text-warmink-3 transition-colors hover:text-red-500">
                  <i className="fa-solid fa-trash text-xs" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        {typeInfo && (
          <div className={`mb-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${typeInfo.color}`}>
            <i className={`fa-solid ${typeInfo.icon}`} /> {typeInfo.label}
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm text-warmink">{renderMentionText(post.content)}</p>
        {post.imageUrl && <img src={post.imageUrl} alt="" className="mt-3 max-h-80 w-full rounded-lg border border-warmborder object-cover" />}
        {post.attachmentUrl && (
          <a href={post.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 rounded-lg border border-warmborder bg-surface-2 p-2 hover:bg-surface-2">
            <i className={`fa-solid ${attachmentIcon}`} />
            <span className="min-w-0 flex-1 truncate text-sm text-warmink-2">{post.attachmentName || 'File đính kèm'}</span>
            <span className="text-xs text-warmink-3">{Math.max(1, Math.round((post.attachmentSize || 0) / 1024))} KB</span>
            <i className="fa-solid fa-download text-warmink-3" />
          </a>
        )}
        <PollBox channelId={channelId} poll={post.poll} onVote={onPollVote} />
      </div>

      <div className="flex items-center gap-4 border-t border-warmborder px-4 py-2.5">
        <button onClick={toggleLike} className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-red-500' : 'text-warmink-3 hover:text-red-400'}`}>
          <i className={`fa-${liked ? 'solid' : 'regular'} fa-heart`} />
          <span>{likeCount}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-sm text-warmink-3 transition-colors hover:text-primary-600">
          <i className="fa-regular fa-comment" />
          <span>{post.commentCount || 0}</span>
        </button>
      </div>

      {showComments && <CommentSection channelId={channelId} postId={post.id} incomingComments={incomingComments} />}
    </div>
  );
}

export default function Channel() {
  const { id } = useParams();
  const { user } = useAuth();
  const [channel, setChannel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [postType, setPostType] = useState('discussion');
  const [attachment, setAttachment] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const connectionRef = useRef(null);

  const canManage = channel?.event?.organizerId === user?.id || user?.role === 'Admin';
  const visibleTabs = canManage ? filterTabs : filterTabs.filter((tab) => tab.value !== 'announcement' || posts.some((post) => post.postType === 'announcement'));

  const loadChannel = async () => {
    try {
      const response = await channelApi.getById(id);
      setChannel(response.data);
    } catch {
      setChannel(null);
    }
  };

  const loadPosts = async (nextPage = 1, nextType = filterType) => {
    if (nextPage === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const response = await channelApi.getPosts(id, {
        page: nextPage,
        pageSize: 10,
        type: nextType === 'all' ? null : nextType,
      });
      const data = response.data;
      if (nextPage === 1) setPosts(sortPosts(data.items || []));
      else setPosts((prev) => sortPosts([...prev, ...(data.items || [])]));
      setTotalPages(data.totalPages || 1);
      setPage(nextPage);
    } catch {
      if (nextPage === 1) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadChannel();
    loadPosts(1, filterType);
    setCommentsByPost({});
  }, [id]);

  useEffect(() => {
    loadPosts(1, filterType);
  }, [filterType]);

  useEffect(() => {
    const token = authStorage.getToken();
    if (!token || !id) return undefined;

    // Dev: EventService runs on :5003 (Vite only proxies /api). Production: VITE_HUB_URL=/hubs/channel
    // is served same-origin and reverse-proxied (with websocket upgrade) by the edge to EventService.
    const hubUrl = import.meta.env.VITE_HUB_URL || 'http://localhost:5003/hubs/channel';
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    connection.on('PostCreated', (post) => {
      setPosts((prev) => {
        if (filterType !== 'all' && post.postType !== filterType) return prev;
        const withoutDuplicate = prev.filter((item) => item.id !== post.id);
        return sortPosts([post, ...withoutDuplicate]);
      });
    });

    connection.on('CommentAdded', ({ postId, comment }) => {
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []).filter((item) => item.id !== comment.id), comment],
      }));
      setPosts((prev) => prev.map((post) => (
        post.id === postId ? { ...post, commentCount: (post.commentCount || 0) + 1 } : post
      )));
    });

    connection.on('PollUpdated', (poll) => {
      setPosts((prev) => prev.map((post) => (
        post.poll?.id === poll.id ? { ...post, poll } : post
      )));
    });

    connection.start()
      .then(() => connection.invoke('JoinChannel', Number(id)))
      .catch(() => {});
    connectionRef.current = connection;

    return () => {
      connection.invoke('LeaveChannel', Number(id)).catch(() => {}).finally(() => connection.stop());
      connectionRef.current = null;
    };
  }, [id, filterType]);

  const upsertPost = (post) => {
    setPosts((prev) => sortPosts([post, ...prev.filter((item) => item.id !== post.id)]));
  };

  const resetForm = () => {
    setNewPost('');
    setImageUrl('');
    setPostType('discussion');
    setAttachment(null);
    setShowPollForm(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!newPost.trim()) return;
    setSubmitting(true);
    try {
      let response = await channelApi.createPost(id, {
        content: newPost.trim(),
        imageUrl: imageUrl.trim() || null,
        postType,
        attachment,
      });
      let createdPost = response.data;

      if (showPollForm) {
        const options = pollOptions.map((option) => option.trim()).filter(Boolean);
        if (pollQuestion.trim() && options.length >= 2) {
          const pollResponse = await channelApi.createPoll(id, createdPost.id, {
            question: pollQuestion.trim(),
            allowMultiple: false,
            options,
          });
          createdPost = { ...createdPost, poll: pollResponse.data };
        }
      }

      upsertPost(createdPost);
      resetForm();
    } catch (err) {
      alert(err.response?.data?.message || 'Đăng bài thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm('Xóa bài đăng này?')) return;
    try {
      await channelApi.deletePost(id, postId);
      setPosts((prev) => prev.filter((post) => post.id !== postId));
    } catch (err) {
      alert(err.response?.data?.message || 'Xóa thất bại');
    }
  };

  const handleTogglePin = async (postId) => {
    try {
      const response = await channelApi.togglePin(id, postId);
      setPosts((prev) => sortPosts(prev.map((post) => post.id === postId ? response.data : post)));
    } catch (err) {
      alert(err.response?.data?.message || 'Ghim bài thất bại');
    }
  };

  const handlePollVote = async (pollId, optionId) => {
    try {
      const response = await channelApi.votePoll(id, pollId, optionId);
      setPosts((prev) => prev.map((post) => post.poll?.id === pollId ? { ...post, poll: response.data } : post));
    } catch (err) {
      alert(err.response?.data?.message || 'Bình chọn thất bại');
    }
  };

  const updatePollOption = (index, value) => {
    setPollOptions((prev) => prev.map((item, i) => i === index ? value : item));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <div className="card p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-warmink-2">Kênh</p>
          <Link to={`/channels/${channel?.parentChannelId || channel?.id || id}`} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-2">
            <i className="fa-solid fa-hashtag text-primary-600" /> Chính
          </Link>
          {(channel?.subChannels || []).map((sub) => (
            <Link key={sub.id} to={`/channels/${sub.id}`} className={`mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-2 ${Number(id) === sub.id ? 'bg-primary-50 text-primary-700' : ''}`}>
              <i className="fa-solid fa-clock text-warmink-2" /> {sub.shift?.name || sub.name}
            </Link>
          ))}
        </div>
      </aside>

      <main className="space-y-5">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100">
              <i className="fa-solid fa-hashtag text-lg text-primary-600" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-warmink">{channel?.name || `Kênh #${id}`}</h1>
              {channel?.shift && <p className="mt-0.5 text-sm text-warmink-2">Kênh riêng cho ca: {channel.shift.name}</p>}
            </div>
          </div>
        </div>

        {user && (
          <div className="card p-4">
            {!showForm ? (
              <button onClick={() => setShowForm(true)} className="flex w-full items-center gap-3 text-left">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
                  <i className="fa-solid fa-user text-primary-500" />
                </div>
                <div className="flex-1 rounded-full bg-surface-2 px-4 py-2 text-sm text-warmink-3 transition-colors hover:bg-surface-2">
                  Chia sẻ điều gì đó...
                </div>
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-3">
                  <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
                    <i className="fa-solid fa-user text-primary-500" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={postType} onChange={(event) => setPostType(event.target.value)} className="rounded-lg border border-warmborder px-2 py-1 text-sm">
                        <option value="discussion">Thảo luận</option>
                        <option value="question">Câu hỏi</option>
                        {canManage && <option value="announcement">Thông báo</option>}
                      </select>
                      {canManage && (
                        <button type="button" onClick={() => setShowPollForm((v) => !v)} className="btn-secondary btn-sm">
                          <i className="fa-solid fa-square-poll-vertical" /> Khảo sát
                        </button>
                      )}
                    </div>
                    <MentionTextarea
                      channelId={id}
                      value={newPost}
                      onChange={setNewPost}
                      placeholder="Chia sẻ điều gì đó với cộng đồng..."
                      rows={3}
                      autoFocus
                      className="w-full resize-none border-0 text-sm text-warmink placeholder-gray-400 focus:outline-none"
                    />
                    <ImageUploadField label="Ảnh bài viết" value={imageUrl} onChange={setImageUrl} helper="Tùy chọn, upload ảnh từ máy." compact />
                    <FileUploadField value={attachment} onChange={setAttachment} />
                    {showPollForm && (
                      <div className="space-y-2 rounded-lg border border-warmborder bg-surface-2 p-3">
                        <input value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} placeholder="Câu hỏi khảo sát" className="input-field" />
                        {pollOptions.map((option, index) => (
                          <input key={index} value={option} onChange={(event) => updatePollOption(index, event.target.value)} placeholder={`Lựa chọn ${index + 1}`} className="input-field" />
                        ))}
                        {pollOptions.length < 5 && (
                          <button type="button" onClick={() => setPollOptions((prev) => [...prev, ''])} className="btn-secondary btn-sm">+ Thêm lựa chọn</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-warmborder pt-1">
                  <button type="button" onClick={resetForm} className="btn-secondary btn-sm">Hủy</button>
                  <button type="submit" disabled={submitting || !newPost.trim()} className="btn-primary btn-sm flex items-center gap-1.5">
                    {submitting && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    <i className="fa-solid fa-paper-plane" /> Đăng
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="card flex flex-wrap gap-2 p-3">
          {visibleTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterType(tab.value)}
              className={`btn-sm flex items-center gap-1.5 ${filterType === tab.value ? 'btn-primary' : 'btn-secondary'}`}
            >
              <i className={`fa-solid ${tab.icon}`} /> {tab.label}
            </button>
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="card p-12 text-center">
            <i className="fa-solid fa-comments mb-3 block text-4xl text-warmink-3" />
            <p className="text-warmink-2">Chưa có bài đăng nào.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                channelId={id}
                channel={channel}
                post={post}
                onDelete={handleDelete}
                onTogglePin={handleTogglePin}
                onPollVote={handlePollVote}
                currentUser={user}
                incomingComments={commentsByPost[post.id] || []}
              />
            ))}
            {page < totalPages && (
              <div className="text-center">
                <button onClick={() => loadPosts(page + 1)} disabled={loadingMore} className="btn-secondary mx-auto flex items-center gap-2">
                  {loadingMore ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-warmborder-2 border-t-transparent" /> Đang tải...</> : 'Xem thêm bài đăng'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
