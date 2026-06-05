import React, { useState, useEffect, useCallback } from 'react';
import { channelApi, uploadApi } from '../../services/api';
import Icon from '../../components/common/Icon';
import Loading from '../../components/common/Loading';
import { Alert, getErrorMessage } from '../../components/common/CommonUI';

const unwrapList = (data) => (Array.isArray(data) ? data : data?.items || data?.data || []);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const getDisplayName = (item) => (
  item?.author?.name
  || item?.author?.fullName
  || item?.author?.userName
  || item?.author?.email
  || item?.authorName
  || item?.fullName
  || item?.userName
  || item?.email
  || 'Người dùng'
);

const getAvatarUrl = (item) => (
  item?.author?.avatarUrl
  || item?.author?.avatar
  || item?.author?.imageUrl
  || item?.author?.photoUrl
  || item?.author?.profileImageUrl
  || item?.authorAvatar
  || item?.authorAvatarUrl
  || item?.avatarUrl
  || item?.avatar
  || item?.photoUrl
  || ''
);

const getPostImageUrl = (post) => post?.imageUrl || post?.ImageUrl || '';

const getEventName = (channel) => {
  const rawName = channel?.event?.title
    || channel?.eventTitle
    || channel?.title
    || channel?.name
    || 'Sự kiện';

  return String(rawName)
    .replace(/^#\s*/i, '')
    .replace(/^kênh\s+trao\s+đổi\s*[-–—:]\s*/i, '')
    .replace(/^kenh\s+trao\s+doi\s*[-–—:]\s*/i, '')
    .trim() || 'Sự kiện';
};

export default function Channel() {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [submittingCommentId, setSubmittingCommentId] = useState('');
  const [newPost, setNewPost] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedImage) {
      setImagePreviewUrl('');
      return undefined;
    }

    const url = URL.createObjectURL(selectedImage);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  const loadPosts = useCallback(async (channelId) => {
    if (!channelId) return;
    setPostsLoading(true);
    setError('');
    try {
      const res = await channelApi.getPosts(channelId, { page: 1, pageSize: 20 });
      setPosts(unwrapList(res.data));
    } catch (err) {
      setPosts([]);
      setError(getErrorMessage(err, 'Không thể tải bài viết trong kênh.'));
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const loadComments = useCallback(async (channelId, postId) => {
    if (!channelId || !postId) return;
    try {
      const res = await channelApi.getComments(channelId, postId);
      setCommentsByPost((prev) => ({ ...prev, [postId]: unwrapList(res.data) }));
    } catch {
      setCommentsByPost((prev) => ({ ...prev, [postId]: [] }));
    }
  }, []);

  useEffect(() => {
    channelApi.getAll()
      .then((res) => {
        const list = unwrapList(res.data);
        setChannels(list);
        if (list.length > 0) setSelectedChannel(list[0]);
      })
      .catch((err) => setError(getErrorMessage(err, 'Không thể tải danh sách kênh trao đổi.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedChannel) return;
    setCommentsByPost({});
    setExpandedComments({});
    loadPosts(selectedChannel.id);
  }, [selectedChannel, loadPosts]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    const content = newPost.trim();
    if ((!content && !selectedImage) || !selectedChannel) return;

    setSubmittingPost(true);
    setError('');
    try {
      let imageUrl = '';
      if (selectedImage) {
        const uploadRes = await uploadApi.uploadImage(selectedImage);
        imageUrl = uploadRes?.data?.url || uploadRes?.data?.data?.url || uploadRes?.data?.fileUrl || '';
        if (!imageUrl) throw new Error('Không lấy được đường dẫn ảnh sau khi upload.');
      }

      const res = await channelApi.createPost(selectedChannel.id, { content, imageUrl });
      const createdPost = res.data?.post || res.data;
      setNewPost('');
      setSelectedImage(null);

      if (createdPost?.id) {
        setPosts((prev) => [createdPost, ...prev]);
      } else {
        await loadPosts(selectedChannel.id);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể gửi tin nhắn. Vui lòng thử lại.'));
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.');
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError('Ảnh không được vượt quá 5MB.');
      return;
    }

    setError('');
    setSelectedImage(file);
  };

  const handleToggleComments = async (postId) => {
    const nextExpanded = !expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: nextExpanded }));
    if (nextExpanded && !commentsByPost[postId]) {
      await loadComments(selectedChannel.id, postId);
    }
  };

  const handleAddComment = async (postId) => {
    const content = (commentDrafts[postId] || '').trim();
    if (!content || !selectedChannel) return;

    setSubmittingCommentId(postId);
    setError('');
    try {
      const res = await channelApi.addComment(selectedChannel.id, postId, { content });
      const createdComment = res.data?.comment || res.data;
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));

      if (createdComment?.id) {
        setCommentsByPost((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), createdComment],
        }));
      } else {
        await loadComments(selectedChannel.id, postId);
      }

      setPosts((prev) => prev.map((post) => (
        post.id === postId
          ? { ...post, commentCount: Number(post.commentCount || 0) + 1 }
          : post
      )));
      setExpandedComments((prev) => ({ ...prev, [postId]: true }));
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể gửi bình luận. Vui lòng thử lại.'));
    } finally {
      setSubmittingCommentId('');
    }
  };

  const handleLike = async (postId) => {
    if (!selectedChannel) return;

    const previousPosts = posts;
    setPosts((prev) => prev.map((p) => p.id === postId ? {
      ...p,
      isLiked: !p.isLiked,
      likeCount: Math.max(0, Number(p.likeCount || 0) + (p.isLiked ? -1 : 1)),
    } : p));

    try {
      await channelApi.toggleLike(selectedChannel.id, postId);
    } catch (err) {
      setPosts(previousPosts);
      setError(getErrorMessage(err, 'Không thể cập nhật lượt thích.'));
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <h2 className="text-headline-lg font-bold text-on-surface">Kênh trao đổi</h2>

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-4 shadow-soft border border-outline">
          <h3 className="text-label-md font-bold text-on-surface mb-4 px-2">Sự kiện</h3>
          <div className="space-y-1">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all text-sm ${
                  selectedChannel?.id === ch.id ? 'bg-primary-container text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                {getEventName(ch)}
              </button>
            ))}
            {channels.length === 0 && (
              <p className="text-on-surface-variant text-sm px-2">Chưa có kênh nào.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {selectedChannel && (
            <>
              <div className="bg-white rounded-2xl p-4 shadow-soft border border-outline">
                <h3 className="font-bold text-on-surface mb-1">{getEventName(selectedChannel)}</h3>
                <p className="text-label-sm text-on-surface-variant">{selectedChannel.description || 'Kênh thảo luận sự kiện'}</p>
              </div>

              <form onSubmit={handleCreatePost} className="bg-white rounded-2xl p-3 shadow-soft border border-outline">
                {imagePreviewUrl && (
                  <div className="mb-3 ml-12 inline-flex max-w-full items-start gap-2 rounded-2xl border border-outline bg-surface-variant/40 p-2">
                    <img src={imagePreviewUrl} alt="Ảnh chuẩn bị gửi" className="max-h-40 max-w-xs rounded-xl object-cover" />
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-on-surface-variant hover:text-error"
                      aria-label="Xóa ảnh đã chọn"
                      disabled={submittingPost}
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-primary flex items-center justify-center shrink-0">
                    <Icon name="person" size={20} />
                  </div>
                  <label className={`w-11 h-11 rounded-full border border-outline bg-surface-variant/40 text-on-surface-variant flex items-center justify-center transition-colors shrink-0 ${
                    submittingPost ? 'opacity-50 cursor-not-allowed' : 'hover:text-primary hover:border-primary cursor-pointer'
                  }`} title="Chọn ảnh">
                    <Icon name="image" size={20} />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleImageChange}
                      disabled={submittingPost}
                    />
                  </label>
                  <input
                    type="text"
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="flex-1 h-11 min-w-0 rounded-full border border-outline bg-surface-variant/40 px-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Viết tin nhắn..."
                    disabled={submittingPost}
                  />
                  <button
                    type="submit"
                    disabled={submittingPost || (!newPost.trim() && !selectedImage)}
                    className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    aria-label="Gửi tin nhắn"
                  >
                    <Icon name={submittingPost ? 'progress_activity' : 'send'} size={20} className={submittingPost ? 'animate-spin' : ''} />
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                {postsLoading ? (
                  <Loading />
                ) : posts.map((post) => {
                  const postImageUrl = getPostImageUrl(post);
                  return (
                  <div key={post.id} className="bg-white rounded-2xl p-5 shadow-soft border border-outline">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-primary overflow-hidden">
                        {getAvatarUrl(post) ? (
                          <img src={getAvatarUrl(post)} alt={getDisplayName(post)} className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="person" size={18} />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface text-sm">{getDisplayName(post)}</p>
                        <p className="text-[11px] text-on-surface-variant">
                          {post.createdAt ? new Date(post.createdAt).toLocaleString('vi-VN') : ''}
                        </p>
                      </div>
                    </div>
                    {post.content && (
                      <p className="text-on-surface-variant text-sm leading-relaxed mb-4 whitespace-pre-line">{post.content}</p>
                    )}
                    {postImageUrl && (
                      <a href={postImageUrl} target="_blank" rel="noreferrer" className="mb-4 block w-fit max-w-full">
                        <img
                          src={postImageUrl}
                          alt="Ảnh trong tin nhắn"
                          className="max-h-80 max-w-full rounded-2xl border border-outline object-contain shadow-sm"
                        />
                      </a>
                    )}
                    <div className="flex items-center gap-4 pt-3 border-t border-outline">
                      <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1 text-sm transition-colors ${post.isLiked ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'}`}>
                        <Icon name="thumb_up" size={16} filled={post.isLiked} />
                        {post.likeCount || 0}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleComments(post.id)}
                        className="flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <Icon name="comment" size={16} />
                        {post.commentCount || commentsByPost[post.id]?.length || 0} bình luận
                      </button>
                    </div>

                    {expandedComments[post.id] && (
                      <div className="mt-4 pt-4 border-t border-outline space-y-3">
                        {(commentsByPost[post.id] || []).map((comment) => (
                          <div key={comment.id} className="flex items-start gap-3 rounded-2xl bg-surface-variant/50 p-3">
                            <div className="w-8 h-8 rounded-full bg-primary-container text-primary flex items-center justify-center overflow-hidden shrink-0">
                              {getAvatarUrl(comment) ? (
                                <img src={getAvatarUrl(comment)} alt={getDisplayName(comment)} className="w-full h-full object-cover" />
                              ) : (
                                <Icon name="person" size={16} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-bold text-on-surface text-sm">{getDisplayName(comment)}</p>
                                <span className="text-[11px] text-on-surface-variant">
                                  {comment.createdAt ? new Date(comment.createdAt).toLocaleString('vi-VN') : ''}
                                </span>
                              </div>
                              <p className="text-sm text-on-surface-variant whitespace-pre-line break-words">{comment.content}</p>
                            </div>
                          </div>
                        ))}

                        {(commentsByPost[post.id] || []).length === 0 && (
                          <p className="text-sm text-on-surface-variant">Chưa có bình luận nào.</p>
                        )}

                        <div className="flex gap-2">
                          <input
                            className="input-field flex-1"
                            placeholder="Viết bình luận..."
                            value={commentDrafts[post.id] || ''}
                            onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            disabled={submittingCommentId === post.id}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(post.id);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={submittingCommentId === post.id || !(commentDrafts[post.id] || '').trim()}
                            onClick={() => handleAddComment(post.id)}
                          >
                            <Icon name={submittingCommentId === post.id ? 'progress_activity' : 'send'} size={18} className={submittingCommentId === post.id ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
                {!postsLoading && posts.length === 0 && (
                  <div className="text-center py-12 text-on-surface-variant">
                    <Icon name="forum" size={48} className="text-outline mx-auto mb-3" />
                    <p>Chưa có tin nhắn nào. Hãy là người đầu tiên!</p>
                  </div>
                )}
              </div>
            </>
          )}

          {!selectedChannel && (
            <div className="text-center py-16 text-on-surface-variant">
              <Icon name="forum" size={48} className="text-outline mx-auto mb-3" />
              <p>Chọn một sự kiện để bắt đầu thảo luận.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
