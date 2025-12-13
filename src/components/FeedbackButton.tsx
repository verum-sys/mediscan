import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/config";

interface FeedbackButtonProps {
    targetType: 'differential' | 'classification' | 'clinical_analysis';
    targetId: string;
    onFeedbackSubmitted?: () => void;
    compact?: boolean;
}

export function FeedbackButton({
    targetType,
    targetId,
    onFeedbackSubmitted,
    compact = false
}: FeedbackButtonProps) {
    const [rating, setRating] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
    const [comment, setComment] = useState('');
    const [showComment, setShowComment] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { toast } = useToast();

    const handleRatingClick = async (newRating: 'thumbs_up' | 'thumbs_down') => {
        if (rating === newRating) {
            // Already selected, show comment box
            setShowComment(!showComment);
            return;
        }

        setRating(newRating);

        // Auto-submit if no comment
        if (!showComment) {
            await submitFeedback(newRating, '');
        }
    };

    const submitFeedback = async (selectedRating: 'thumbs_up' | 'thumbs_down', feedbackComment: string) => {
        setSubmitting(true);
        try {
            const response = await fetch(getApiUrl('/api/feedback'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetType,
                    targetId,
                    rating: selectedRating,
                    comment: feedbackComment
                })
            });

            if (!response.ok) throw new Error('Failed to submit feedback');

            toast({
                title: "Feedback Submitted",
                description: "Thank you for your feedback! This helps improve our AI models.",
            });

            if (onFeedbackSubmitted) onFeedbackSubmitted();
            setShowComment(false);
            setComment('');
        } catch (error) {
            console.error('Feedback submission error:', error);
            toast({
                title: "Submission Failed",
                description: "Could not submit feedback. Please try again.",
                variant: "destructive"
            });
            setRating(null);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCommentSubmit = () => {
        if (rating) {
            submitFeedback(rating, comment);
        }
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <Button
                    variant={rating === 'thumbs_up' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleRatingClick('thumbs_up')}
                    disabled={submitting}
                    className="h-8 w-8 p-0"
                >
                    <ThumbsUp className={`h-4 w-4 ${rating === 'thumbs_up' ? 'fill-current' : ''}`} />
                </Button>
                <Button
                    variant={rating === 'thumbs_down' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleRatingClick('thumbs_down')}
                    disabled={submitting}
                    className="h-8 w-8 p-0"
                >
                    <ThumbsDown className={`h-4 w-4 ${rating === 'thumbs_down' ? 'fill-current' : ''}`} />
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Was this helpful?</span>
                <Button
                    variant={rating === 'thumbs_up' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleRatingClick('thumbs_up')}
                    disabled={submitting}
                >
                    <ThumbsUp className={`h-4 w-4 mr-1 ${rating === 'thumbs_up' ? 'fill-current' : ''}`} />
                    Yes
                </Button>
                <Button
                    variant={rating === 'thumbs_down' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleRatingClick('thumbs_down')}
                    disabled={submitting}
                >
                    <ThumbsDown className={`h-4 w-4 mr-1 ${rating === 'thumbs_down' ? 'fill-current' : ''}`} />
                    No
                </Button>
                {rating && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowComment(!showComment)}
                    >
                        {showComment ? 'Hide' : 'Add'} Comment
                    </Button>
                )}
            </div>

            {showComment && (
                <div className="space-y-2 mt-2">
                    <Textarea
                        placeholder="Tell us more about your feedback (optional)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-[60px]"
                    />
                    <Button
                        size="sm"
                        onClick={handleCommentSubmit}
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </Button>
                </div>
            )}
        </div>
    );
}
