"use client";

export type CategoryNode = {
  id: number;
  name: string;
  parent_id?: number | null;
  level: number;
  children?: CategoryNode[];
};

export type FlatCategory = {
  id: number;
  path: string;
};

export function flattenCategories(
  nodes: CategoryNode[],
  parentPath: string[] = []
): FlatCategory[] {
  const rows: FlatCategory[] = [];
  nodes.forEach((node) => {
    const pathParts = [...parentPath, node.name];
    rows.push({ id: node.id, path: pathParts.join(" > ") });
    if (node.children && node.children.length) {
      rows.push(...flattenCategories(node.children, pathParts));
    }
  });
  return rows;
}
