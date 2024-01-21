import { Badge, ButtonBase, SvgIcon } from '@mui/material'
import BatchIcon from '@/public/images/common/batch.svg'
import { useDraftBatch } from '@/hooks/useDraftBatch'
import BatchTooltip from './BatchTooltip'

const BatchIndicator = ({ onClick }: { onClick?: () => void }) => {
  const { length } = useDraftBatch()

  return (
    <BatchTooltip>
      <ButtonBase title="Batch" onClick={onClick} sx={{ p: 2 }}>
        <Badge
          variant="standard"
          badgeContent={length}
          color={'secondary'}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
        >
          <SvgIcon component={BatchIcon} inheritViewBox fontSize="medium" />
        </Badge>
      </ButtonBase>
    </BatchTooltip>
  )
}

export default BatchIndicator
