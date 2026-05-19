import React from 'react';
import MasonryGrid from '@/components/ui/masonry-grid';

type GalleryItem = {
  id: number;
  src: string;
};

const galleryItems: GalleryItem[] = [
  {
    id: 1,
    src: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 2,
    src: 'https://images.unsplash.com/photo-1504674900247-ec6f7f4f4c06?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 3,
    src: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 4,
    src: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 5,
    src: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 6,
    src: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 7,
    src: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 8,
    src: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 9,
    src: 'https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 10,
    src: 'https://images.unsplash.com/photo-1481070414801-51fd732d7184?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 11,
    src: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=900&q=60',
  },
  {
    id: 12,
    src: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=60',
  },
];

const MasonryGridDemo = () => {
  return (
    <div className="min-h-screen w-full bg-[#f5f2ee] p-4 sm:p-6 md:p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-[#171717] dark:text-slate-100 md:text-5xl">
            Inspiration Gallery
          </h1>
          <p className="mt-2 text-lg text-[#4b4b4b] dark:text-slate-300">
            A showcase of food photography and plating ideas
          </p>
        </div>

        <MasonryGrid
          items={galleryItems}
          getItemKey={(item) => item.id}
          className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4"
          gap="1rem"
          renderItem={(item) => (
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-soft transition-shadow duration-300 hover:shadow-float dark:border-slate-700/60 dark:bg-slate-900/80">
              <img
                src={item.src}
                alt={`Gallery item ${item.id}`}
                className="h-auto w-full object-cover"
                loading="lazy"
              />
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default MasonryGridDemo;
