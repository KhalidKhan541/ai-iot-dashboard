'use client';

interface TextWidgetProps {
  data: {
    title?: string;
    content?: string;
    markdown?: boolean;
  };
}

export function TextWidget({ data }: TextWidgetProps) {
  const content = data.content || 'Add your notes or description here. This widget is useful for adding context to your dashboard.';

  return (
    <div className="h-full overflow-auto">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
