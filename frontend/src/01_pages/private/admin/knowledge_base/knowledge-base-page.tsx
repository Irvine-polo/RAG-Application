import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { mainInstance } from '@/07_instances/main-instance';
import FileDropzone from '@/components/dropzone/file-dropzone';
import Tooltip from '@/components/tooltip/tooltip';
import PageHeader from '@/components/typography/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getDateTimezone } from '@/lib/date/get-date-timezone';

const FormSchema = z.object({
  title: z.string().optional(),
  file: z.any().refine((files) => files?.length === 1, {
    message: 'File is required',
  }),
});

interface Document {
  id: number;
  title: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  created_at: string;
  error_message?: string;
  original_filename?: string;
}

// Extracted Status Badge Component
const StatusBadge = ({
  status,
  errorMessage,
}: {
  status: Document['status'];
  errorMessage?: string;
}) => {
  switch (status) {
    case 'ready':
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle2 className="size-3" /> Ready
        </Badge>
      );
    case 'failed':
      return (
        <Tooltip content={errorMessage || 'Processing Failed'}>
          <Badge variant="destructive" className="flex cursor-help items-center gap-1">
            <XCircle className="size-3" /> Failed
          </Badge>
        </Tooltip>
      );
    case 'pending':
    case 'processing':
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <Loader2 className="size-3 animate-spin" />
          {status === 'pending' ? 'Pending' : 'Processing'}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const KnowledgeBasePage = () => {
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: '',
      file: [],
    },
  });

  // Query for documents
  const { data: documentsRaw, isLoading } = useQuery({
    queryKey: ['knowledge-base'],
    queryFn: async () => {
      const response = await mainInstance.get('/knowledge-base');
      return response.data;
    },
    refetchInterval: (query) => {
      const data = query.state?.data as any;
      const documentsList = Array.isArray(data) ? data : (data?.data || data?.records || []);
      
      // Refetch every 3 seconds if any document is processing or pending
      if (Array.isArray(documentsList) && documentsList.some((doc: Document) => doc.status === 'pending' || doc.status === 'processing')) {
        return 3000;
      }
      return false;
    },
  });

  const documents: Document[] = Array.isArray(documentsRaw) 
    ? documentsRaw 
    : (documentsRaw?.data || documentsRaw?.records || []);

  // Mutation for upload
  const uploadMutation = useMutation({
    mutationFn: async (data: z.infer<typeof FormSchema>) => {
      const formData = new FormData();
      if (data.title) {
        formData.append('title', data.title);
      }
      formData.append('file', data.file[0]);

      const response = await mainInstance.post('/knowledge-base/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Document uploaded successfully');
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to upload document'
      );
    },
  });

  const onSubmit = (data: z.infer<typeof FormSchema>) => {
    uploadMutation.mutate(data);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await mainInstance.delete(`/knowledge-base/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Document deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to delete document'
      );
    },
  });

  return (
    <>
      <div className="mb-layout flex flex-col justify-between gap-1 @sm/main:flex-row @sm/main:items-center">
        <PageHeader>Knowledge Base</PageHeader>
      </div>

      <div className="gap-layout flex flex-col items-start lg:flex-row">
        {/* Upload Form Area */}
        <Card className="w-full shrink-0 lg:w-[400px]">
          <CardHeader>
            <CardTitle className="text-lg">Upload Document</CardTitle>
          </CardHeader>
          <CardBody>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter a descriptive title..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="file"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Document File</FormLabel>
                      <FormControl>
                        <FileDropzone
                          isInvalid={fieldState.invalid}
                          files={field.value}
                          onDrop={(acceptedFiles) => field.onChange(acceptedFiles)}
                          setFiles={field.onChange}
                          onRemove={() => field.onChange([])}
                          accept={{
                            'application/pdf': ['.pdf'],
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                            'text/plain': ['.txt'],
                          }}
                          maxSize={20971520} // 20MB
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={uploadMutation.isPending}
                    className="w-full"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Upload'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardBody>
        </Card>

        {/* Documents Table */}
        <Card className="min-w-0 flex-1 w-full">
          <CardHeader>
            <CardTitle className="text-lg">Documents</CardTitle>
          </CardHeader>
          <CardBody>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[200px]">Created At</TableHead>
                  <TableHead className="w-[80px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, index) => (
                    <TableRow key={index} className="pointer-events-none">
                      <TableCell colSpan={5}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : documents?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-32">
                      <div className="flex flex-col items-center justify-center text-muted-foreground p-4">
                        <FileText className="mb-2 h-10 w-10 opacity-50" />
                        <p>No documents found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  documents?.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>{doc.id}</TableCell>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={doc.status}
                          errorMessage={doc.error_message}
                        />
                      </TableCell>
                      <TableCell>
                        {getDateTimezone(doc.created_at, 'date_time')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip content="Delete">
                          <Button
                            variant="destructive"
                            size="icon-xs"
                            disabled={deleteMutation.isPending && deleteMutation.variables === doc.id}
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this document?')) {
                                deleteMutation.mutate(doc.id);
                              }
                            }}
                          >
                            {deleteMutation.isPending && deleteMutation.variables === doc.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 />
                            )}
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>
    </>
  );
};

export default KnowledgeBasePage;