
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Image, Link2, Send, X, Tag as TagIcon } from 'lucide-react';
import { registerCommunityPost, uploadPostMedia } from '@/lib/community';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import { useCommunity } from '@/contexts/community/CommunityContext';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { getAllTags, createTag } from '@/lib/community/tags-service';
import { Tag } from '@/lib/community/types';

interface NewPostFormProps {
  user: {
    id: string;
    email?: string;
  } | null;
}

export function NewPostForm({ user }: NewPostFormProps) {
  const { isAuthenticated } = useAuth();
  const { loading, handlePostCreated } = useCommunity();
  
  const [newPostContent, setNewPostContent] = useState('');
  const [title, setTitle] = useState('');
  const [uploadedMediaUrls, setUploadedMediaUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  
  // Fetch available tags
  useEffect(() => {
    async function fetchTags() {
      const tags = await getAllTags();
      setAvailableTags(tags);
    }
    fetchTags();
  }, []);
  
  // Handle media upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !isAuthenticated) return;
    
    setIsUploading(true);
    
    try {
      // Only allow up to 5 images
      const remainingSlots = 5 - uploadedMediaUrls.length;
      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      
      if (filesToUpload.length < files.length) {
        toast.warning(`ניתן להעלות עד 5 תמונות. נבחרו ${files.length} תמונות אך רק ${filesToUpload.length} יועלו.`);
      }
      
      const uploadPromises = filesToUpload.map(file => uploadPostMedia(user!.id, file));
      const results = await Promise.all(uploadPromises);
      
      const successfulUploads = results.filter(url => url !== null) as string[];
      setUploadedMediaUrls(prev => [...prev, ...successfulUploads]);
      
      if (successfulUploads.length > 0) {
        toast.success(`הועלו ${successfulUploads.length} תמונות בהצלחה`);
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error('שגיאה בהעלאת קבצי מדיה');
    } finally {
      setIsUploading(false);
      // Clear the input to allow uploading the same file again
      e.target.value = '';
    }
  };
  
  // Remove uploaded media
  const handleRemoveMedia = (indexToRemove: number) => {
    setUploadedMediaUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  // Handle tag selection
  const handleTagSelect = (tagId: string) => {
    const tag = availableTags.find(t => t.id === tagId);
    if (tag && !selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags(prev => [...prev, tag]);
    }
  };
  
  // Handle tag removal
  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(prev => prev.filter(tag => tag.id !== tagId));
  };
  
  // Create new tag
  const handleCreateTag = async () => {
    if (!newTagInput.trim() || !isAuthenticated) return;
    
    try {
      const tagId = await createTag(newTagInput.trim());
      
      if (tagId) {
        const newTag = { id: tagId, name: newTagInput.trim() };
        setAvailableTags(prev => [...prev, newTag]);
        setSelectedTags(prev => [...prev, newTag]);
        setNewTagInput('');
        toast.success('התגית נוצרה בהצלחה');
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };
  
  // Create post with title, content, media, and tags
  const handleCreatePost = async () => {
    if (!isAuthenticated) {
      toast.error('יש להתחבר כדי לפרסם');
      return;
    }
    
    if (!newPostContent.trim()) {
      toast.error('לא ניתן לפרסם פוסט ריק');
      return;
    }

    const postTitle = title.trim() || newPostContent.split('\n')[0] || 'פוסט חדש';

    try {
      const selectedTagIds = selectedTags.map(tag => tag.id);
      const postId = await registerCommunityPost(
        user!.id,
        postTitle,
        newPostContent,
        uploadedMediaUrls,
        selectedTagIds
      );
      
      if (postId) {
        setNewPostContent('');
        setTitle('');
        setUploadedMediaUrls([]);
        setSelectedTags([]);
        await handlePostCreated();
        toast.success('הפוסט פורסם בהצלחה!');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('שגיאה בפרסום הפוסט');
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={isAuthenticated ? `https://avatar.vercel.sh/${user?.id}?size=40` : "https://i.pravatar.cc/150?img=30"} />
            <AvatarFallback>{user?.email?.charAt(0) || 'G'}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            {/* Title input */}
            <Input
              placeholder={isAuthenticated ? "כותרת הפוסט (אופציונלי)" : "התחבר כדי לפרסם..."}
              className="mb-3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isAuthenticated || loading}
              maxLength={100}
            />
            
            {/* Content input */}
            <Textarea
              placeholder={isAuthenticated ? "שתף את המחשבות שלך..." : "התחבר כדי לפרסם..."}
              className="min-h-[100px] resize-none mb-3 border-gray-200"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              disabled={!isAuthenticated || loading}
            />
            
            {/* Display selected tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {selectedTags.map(tag => (
                  <Badge key={tag.id} variant="outline" className="bg-blue-50 flex items-center gap-1">
                    {tag.name}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-4 w-4 p-0 hover:bg-blue-100" 
                      onClick={() => handleRemoveTag(tag.id)}
                    >
                      <X size={10} />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Display uploaded media */}
            {uploadedMediaUrls.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mb-3">
                {uploadedMediaUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <AspectRatio ratio={1/1} className="bg-muted rounded-md overflow-hidden">
                      <Image 
                        src={url} 
                        alt={`תמונה ${index + 1}`} 
                        fill 
                        className="object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveMedia(index)}
                      >
                        <X size={14} />
                      </Button>
                    </AspectRatio>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {/* Media upload button */}
                <div className="relative">
                  <input
                    type="file"
                    id="media-upload"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleMediaUpload}
                    accept="image/*"
                    multiple
                    disabled={!isAuthenticated || loading || isUploading || uploadedMediaUrls.length >= 5}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1 relative" 
                    disabled={!isAuthenticated || loading || isUploading || uploadedMediaUrls.length >= 5}
                  >
                    <Image size={16} />
                    {isUploading ? 'מעלה...' : 'תמונה'}
                  </Button>
                </div>
                
                {/* Link button (placeholder) */}
                <Button variant="outline" size="sm" className="gap-1" disabled={!isAuthenticated || loading}>
                  <Link2 size={16} />
                  קישור
                </Button>
                
                {/* Tags dropdown */}
                <div className="flex items-center gap-1">
                  <Combobox
                    items={availableTags.map(tag => ({
                      label: tag.name,
                      value: tag.id
                    }))}
                    placeholder="הוסף תגית..."
                    onSelect={handleTagSelect}
                    disabled={!isAuthenticated || loading}
                    triggerClassName="h-9 gap-1"
                    triggerContent={<><TagIcon size={16} /> תגיות</>}
                  />
                  
                  {/* New tag input */}
                  <div className="flex gap-1">
                    <Input
                      placeholder="תגית חדשה"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      className="h-9 max-w-[120px]"
                      disabled={!isAuthenticated || loading}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCreateTag}
                      disabled={!isAuthenticated || loading || !newTagInput.trim()}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Publish button */}
              <Button 
                onClick={handleCreatePost} 
                className="gap-1" 
                disabled={!isAuthenticated || loading || !newPostContent.trim()}
              >
                <Send size={16} />
                פרסם {isAuthenticated && "(+10 נקודות)"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
