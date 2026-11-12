import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  CategoryImageUpload,
  DeleteCategoryButton,
  ToggleVisibilityButton,
} from "./category-actions";

function imageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/category_images/${path}`;
}

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("categories")
    .select("id, name, slug, image_path, is_active, sort_order")
    .order("sort_order")
    .order("name");

  const categories = rows ?? [];
  const hasPhoto = (path: string | null) => Boolean(path && path !== "pending");
  const withPhoto = categories.filter((c) => hasPhoto(c.image_path)).length;
  const missing = categories.length - withPhoto;

  return (
    <div className="mx-auto flex w-full flex-col gap-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <h1 className="text-xl font-bold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            What suppliers will browse. Hidden items stay invisible until you
            turn them on.
          </p>
        </div>
        <Button
          render={<Link href="/admin/dashboard/categories/new" />}
          nativeButton={false}
        >
          Add category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyTitle>No categories yet</EmptyTitle>
              <EmptyDescription>
                Add the first one to get started.
              </EmptyDescription>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div
              className={
                missing > 0
                  ? "flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm"
                  : "flex flex-wrap items-center justify-between gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm"
              }
            >
              <span className="font-medium">
                {withPhoto} of {categories.length} categories have a photo
              </span>
              <span className="text-xs text-muted-foreground">
                {missing > 0
                  ? `${missing} still need one. Tap a "No photo" box to upload (JPG, PNG or WEBP, under 5 MB).`
                  : "Every category has a photo. Tap a photo to change it."}
              </span>
            </div>
            <ItemGroup>
              {categories.map((category) => (
                <Item key={category.id} variant="outline" size="sm">
                  <CategoryImageUpload
                    id={category.id}
                    name={category.name}
                    imageUrl={hasPhoto(category.image_path) ? imageUrl(category.image_path!) : null}
                  />
                  <ItemContent>
                    <ItemTitle>{category.name}</ItemTitle>
                    <ItemDescription>
                      {category.is_active ? "Visible" : "Hidden"}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <StatusBadge
                      status="visibility"
                      value={category.is_active ? "active" : "inactive"}
                    />
                    <ToggleVisibilityButton
                      id={category.id}
                      isActive={category.is_active}
                    />
                    <Button
                      render={
                        <Link
                          href={`/admin/dashboard/categories/${category.id}/edit`}
                        />
                      }
                      nativeButton={false}
                      variant="outline"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <DeleteCategoryButton id={category.id} />
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
