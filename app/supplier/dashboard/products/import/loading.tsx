import {
  FormSectionSkeleton,
  PageHeaderSkeleton,
} from "@/components/dashboard/skeletons";

export default function ImportProductsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeaderSkeleton action={false} />
      <FormSectionSkeleton fields={2} columns={1} titleWidth="w-32" />
    </div>
  );
}
