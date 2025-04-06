
import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, XCircle, Tag as TagIcon } from 'lucide-react';
import { useCommunity } from '@/contexts/community/CommunityContext';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface NewPostFormProps {
  user?: any;
}

export function NewPostForm({ user }: NewPostFormProps) {
  const { addNewPost, tags } = useCommunity();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<{id: string, name: string}[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Only handle image files
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const files = Array.from(e.target.files).filter(file => 
        validImageTypes.includes(file.type)
      );
      
      if (files.length === 0) {
        toast.error('ניתן להעלות רק קבצי תמונה (JPG, PNG, GIF, WEBP)');
        setIsLoading(false);
        return;
      }
      
      // Limit to 5 files
      if (uploadedImages.length + files.length > 5) {
        toast.error('ניתן להעלות עד 5 תמונות לפוסט');
        setIsLoading(false);
        return;
      }
      
      // Limit file size to 5MB each
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
      
      if (oversizedFiles.length > 0) {
        toast.error(`קובץ גדול מדי. הגודל המקסימלי הוא 5MB`);
        setIsLoading(false);
        return;
      }
      
      const newImages: string[] = [...uploadedImages];
      
      for (const file of files) {
        // Upload file and get URL
        try {
          const { createPost } = useCommunity();
          const imageUrl = await createPost.uploadMedia(file);
          
          if (imageUrl) {
            newImages.push(imageUrl);
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          toast.error('שגיאה בהעלאת התמונה');
        }
      }
      
      setUploadedImages(newImages);
    } catch (error) {
      console.error('Error handling file upload:', error);
      toast.error('שגיאה בהעלאת הקבצים');
    } finally {
      setIsLoading(false);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const removeImage = (index: number) => {
    const newImages = [...uploadedImages];
    newImages.splice(index, 1);
    setUploadedImages(newImages);
  };
  
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    
    // Check if tag already exists in selected tags
    const tagExists = selectedTags.some(
      tag => tag.name.toLowerCase() === tagInput.trim().toLowerCase()
    );
    
    if (tagExists) {
      toast.error('התגית כבר נבחרה');
      return;
    }
    
    // Check if tag exists in the available tags
    const existingTag = tags.find(
      tag => tag.name.toLowerCase() === tagInput.trim().toLowerCase()
    );
    
    if (existingTag) {
      setSelectedTags([...selectedTags, existingTag]);
    } else {
      // This is just for the UI, the tag will be created on the backend when submitting
      setSelectedTags([
        ...selectedTags, 
        { id: `temp-${Date.now()}`, name: tagInput.trim() }
      ]);
    }
    
    setTagInput('');
  };
  
  const removeTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(tag => tag.id !== tagId));
  };
  
  const handleSubmit = async () => {
    if (!user) {
      toast.error('יש להתחבר כדי לפרסם');
      return;
    }
    
    if (!title.trim()) {
      toast.error('יש להזין כותרת');
      return;
    }
    
    if (!content.trim()) {
      toast.error('יש להזין תוכן');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const tagIds = selectedTags
        .filter(tag => !tag.id.startsWith('temp-'))
        .map(tag => tag.id);
      
      const newTagNames = selectedTags
        .filter(tag => tag.id.startsWith('temp-'))
        .map(tag => tag.name);
      
      const success = await addNewPost(
        title,
        content,
        uploadedImages,
        tagIds,
        newTagNames
      );
      
      if (success) {
        setTitle('');
        setContent('');
        setUploadedImages([]);
        setSelectedTags([]);
        setShowFullForm(false);
        toast.success('הפוסט פורסם בהצלחה!');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('שגיאה בפרסום הפוסט');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <p>יש להתחבר כדי לפרסם</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent className="p-6">
        {!showFullForm ? (
          <div 
            className="flex gap-4 items-center cursor-pointer"
            onClick={() => setShowFullForm(true)}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={`https://avatar.vercel.sh/${user.id}?size=40`} />
              <AvatarFallback>{user.email?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="bg-secondary/50 text-muted-foreground rounded-full px-4 py-2 flex-1">
              על מה בא לך לדבר?
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://avatar.vercel.sh/${user.id}?size=40`} />
                <AvatarFallback>{user.email?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {user.firstName || user.lastName 
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    : `סוחר${user.id.substring(0, 4)}`
                  }
                </p>
              </div>
            </div>
            
            <Input
              placeholder="כותרת הפוסט"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-none bg-muted/30 text-lg font-medium"
            />
            
            <Textarea
              placeholder="תוכן הפוסט..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] border-none bg-muted/30"
            />
            
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {uploadedImages.map((imageUrl, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={imageUrl} 
                      alt={`תמונה ${index+1}`} 
                      className="w-full h-24 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map(tag => (
                  <Badge 
                    key={tag.id} 
                    variant="secondary" 
                    className="pr-1"
                  >
                    {tag.name}
                    <button 
                      onClick={() => removeTag(tag.id)} 
                      className="ml-1 h-4 w-4 rounded-full"
                    >
                      <XCircle size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="הוסף תגית..."
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
                className="gap-1"
              >
                <TagIcon size={14} /> הוסף
              </Button>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isLoading || uploadedImages.length >= 5}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || uploadedImages.length >= 5}
                  className="gap-1"
                >
                  <Upload size={16} /> הוסף תמונה
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowFullForm(false)}
                  disabled={isLoading}
                >
                  ביטול
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isLoading || !title.trim() || !content.trim()}
                  className="gap-1"
                >
                  {isLoading ? 'שולח...' : 'פרסם'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
