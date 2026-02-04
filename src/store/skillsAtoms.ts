import { atom } from 'jotai';
import type {
  SkillRegistryEntry,
  SkillDetail,
  SkillFilter,
  SkillSortOption,
} from '@/types/skills';

// Skills 列表
export const skillsListAtom = atom<SkillRegistryEntry[]>([]);

// 当前选中的 Skill
export const selectedSkillAtom = atom<SkillDetail | null>(null);

// Skills 过滤器
export const skillsFilterAtom = atom<SkillFilter>({
  search: '',
  source: 'all',
  enabled: undefined,
  tags: [],
});

// Skills 排序
export const skillsSortByAtom = atom<SkillSortOption>('name');
export const skillsSortOrderAtom = atom<'asc' | 'desc'>('asc');

// Skills 加载状态
export const skillsLoadingAtom = atom<boolean>(false);

// Skills 错误状态
export const skillsErrorAtom = atom<string | null>(null);

// 派生 atom：过滤后的 Skills 列表
export const filteredSkillsAtom = atom((get) => {
  const skills = get(skillsListAtom);
  const filter = get(skillsFilterAtom);
  const sortBy = get(skillsSortByAtom);
  const sortOrder = get(skillsSortOrderAtom);

  let filtered = [...skills];

  // 搜索过滤
  if (filter.search) {
    const searchLower = filter.search.toLowerCase();
    filtered = filtered.filter(
      (skill) =>
        skill.name.toLowerCase().includes(searchLower) ||
        skill.description.toLowerCase().includes(searchLower)
    );
  }

  // 来源过滤
  if (filter.source && filter.source !== 'all') {
    filtered = filtered.filter((skill) => skill.source === filter.source);
  }

  // 启用状态过滤
  if (filter.enabled !== undefined) {
    filtered = filtered.filter((skill) => skill.enabled === filter.enabled);
  }

  // 标签过滤
  if (filter.tags && filter.tags.length > 0) {
    filtered = filtered.filter((skill) =>
      filter.tags!.some((tag) => skill.metadata.tags?.includes(tag))
    );
  }

  // 排序
  filtered.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'updatedAt':
        comparison = (a.metadata.updatedAt || '').localeCompare(b.metadata.updatedAt || '');
        break;
      case 'createdAt':
        comparison = (a.metadata.createdAt || '').localeCompare(b.metadata.createdAt || '');
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return filtered;
});
