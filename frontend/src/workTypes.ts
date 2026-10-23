export type Work = {
  id: number;
  title: string;
  description: string;
  occasion: string;
  video_url: string;
  poster_url: string;
  gallery: string[];
  width: number;
  height: number;
  duration: string | number;
  product_id: number | null;
};
