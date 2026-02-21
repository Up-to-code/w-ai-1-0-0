"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2 } from "lucide-react";
import { CategoryFormDialog } from "./CategoryFormDialog";

type Props = {
  phoneNumberId: string;
};

export function CategoryList({ phoneNumberId }: Props) {
  const [search, setSearch] = useState("");
  const categories = useQuery((api as any).manualCatalog.listCategories, {
    phoneNumberId,
    search: search.trim() || undefined,
    includeInactive: true,
  });
  const deleteCategory = useMutation((api as any).manualCatalog.deleteCategory);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="ابحث عن تصنيف" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <CategoryFormDialog phoneNumberId={phoneNumberId} />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {(categories || []).map((category: any) => (
          <Card key={category._id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{category.name}</h3>
                <Badge variant={category.source === "ai" ? "secondary" : "outline"}>
                  {category.source === "ai" ? "AI" : "يدوي"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{category.description || "لا يوجد وصف"}</p>
              <p className="text-xs text-muted-foreground">المنتجات: {category.productsCount || 0}</p>
              <div className="flex gap-2 pt-1">
                <CategoryFormDialog
                  phoneNumberId={phoneNumberId}
                  category={category}
                  trigger={
                    <Button size="sm" variant="outline">
                      <Pencil className="h-3.5 w-3.5 ml-1" />
                      تعديل
                    </Button>
                  }
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => deleteCategory({ categoryId: category._id })}
                >
                  <Trash2 className="h-3.5 w-3.5 ml-1" />
                  حذف
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories && categories.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">لا توجد تصنيفات بعد</CardContent>
        </Card>
      )}
    </div>
  );
}
